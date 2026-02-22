import logging
import json

from ..llm.adapters import AnthropicAdapter, GeminiAdapter
from ..tools.definitions import ToolCall, STRUCTURER_TOOLS, SANDBOX_TOOLS, get_tool_schema
from ..tools.executor import ToolExecutor
from ..tools.loop_detection import ToolLoopDetector
from ..storage.convex_client import ConvexClient
from ..storage.context import SubAgentReport

logger = logging.getLogger(__name__)


class StructurerAgent:
    """Processes individual files/emails and extracts structured content."""

    def __init__(
        self,
        claude: AnthropicAdapter,
        gemini: GeminiAdapter,
        executor,
        convex: ConvexClient,
        client_id: str,
        file_refs: list[dict],
        tools: list[dict] | None = None,
    ):
        self.claude = claude
        self.gemini = gemini
        self.executor = executor
        self.convex = convex
        self.client_id = client_id
        self.file_refs = file_refs
        self._tools = tools
        self.max_turns = 20

    async def run(self) -> SubAgentReport:
        await self.convex.emit_event(
            self.client_id,
            "structurer",
            "info",
            f"Starting structurer with {len(self.file_refs)} files to process",
        )

        tools = self._tools or (
            [get_tool_schema(t) for t in STRUCTURER_TOOLS]
            + [get_tool_schema(t) for t in SANDBOX_TOOLS]
        )
        tool_names = [t["name"] for t in tools]

        file_summary = json.dumps(self.file_refs, indent=2, default=str)

        # Build system prompt dynamically from available tools
        tool_list = "\n".join(f"  - {name}" for name in tool_names)
        system = (
            "You are a structurer agent responsible for extracting and classifying content "
            "from business data sources (emails, files, spreadsheets).\n\n"

            f"## Available Tools\n{tool_list}\n\n"

            "## Workflow\n"
            "For each resource in your batch:\n"
            "1. Fetch/read its content using the available tools\n"
            "2. Classify its relevance using classify_relevance\n"
            "3. If you find contradicting information between sources, report with add_contradiction\n"
            "4. Share important discoveries on the forum\n"
            "5. When done processing all resources, send a summary to the master via message_master\n\n"

            "## Rules\n"
            "- Only use the tools listed above — they are the complete set available to you.\n"
            "- Do NOT install Google SDK packages or look for credentials.\n"
            "- Tools prefixed with GMAIL_ or GOOGLEDRIVE_ are pre-authenticated — call them directly."
        )

        messages = [
            {
                "role": "user",
                "content": (
                    f"Process the following {len(self.file_refs)} resources, extract their content, "
                    f"classify relevance, and report any contradictions you find.\n\n"
                    f"Resources:\n{file_summary}"
                ),
            }
        ]
        report = SubAgentReport(agent_name="structurer", source_type="mixed")

        detector = ToolLoopDetector()

        for turn in range(self.max_turns):
            text, tool_calls_raw = await self.claude.complete_with_tools_messages(
                messages, tools, system
            )

            if not tool_calls_raw:
                # No more tool calls -- agent is done
                if text:
                    report.findings.append(text)
                break

            # Build assistant content block with text + tool_use blocks
            assistant_content = []
            if text:
                assistant_content.append({"type": "text", "text": text})
            for tc in tool_calls_raw:
                assistant_content.append(
                    {
                        "type": "tool_use",
                        "id": tc["id"],
                        "name": tc["name"],
                        "input": tc["input"],
                    }
                )
            messages.append({"role": "assistant", "content": assistant_content})

            # Execute each tool call
            tool_results = []
            for tc in tool_calls_raw:
                call = ToolCall(id=tc["id"], name=tc["name"], input=tc["input"])
                detector.record(call.name, call.input)

                # Intercept add_contradiction to capture in report
                if call.name == "add_contradiction":
                    contradiction = {
                        "description": call.input.get("description", ""),
                        "source_a": call.input.get("source_a", ""),
                        "source_b": call.input.get("source_b", ""),
                        "value_a": call.input.get("value_a", ""),
                        "value_b": call.input.get("value_b", ""),
                    }
                    report.contradictions.append(contradiction)
                    logger.info(f"Contradiction found: {contradiction['description']}")

                    # Also execute it via the executor to store in Convex
                    result = await self.executor.execute(call)
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": call.id,
                            "content": result.content,
                            "is_error": result.is_error,
                        }
                    )

                elif call.name == "message_master":
                    # Capture the message as a finding
                    msg = call.input.get("message", "")
                    report.findings.append(msg)
                    await self.convex.emit_event(
                        self.client_id,
                        "structurer",
                        "progress",
                        f"Structurer message: {msg[:200]}",
                    )
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": call.id,
                            "content": "Message delivered to master agent.",
                        }
                    )

                else:
                    result = await self.executor.execute(call)
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": call.id,
                            "content": result.content,
                            "is_error": result.is_error,
                        }
                    )

            messages.append({"role": "user", "content": tool_results})

            # Check for stuck loops after processing all tool calls this turn
            if detector.is_stuck():
                logger.warning("Structurer: loop detected, breaking")
                break

        await self.convex.emit_event(
            self.client_id,
            "structurer",
            "complete",
            f"Structuring complete: {len(report.findings)} findings, {len(report.contradictions)} contradictions",
        )
        return report
