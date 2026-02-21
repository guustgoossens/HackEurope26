import logging
import json

from ..llm.adapters import AnthropicAdapter, GeminiAdapter
from ..tools.definitions import ToolCall, STRUCTURER_TOOLS, get_tool_schema
from ..tools.executor import ToolExecutor
from ..storage.convex_client import ConvexClient
from ..storage.context import SubAgentReport

logger = logging.getLogger(__name__)


class StructurerAgent:
    """Processes individual files/emails and extracts structured content."""

    def __init__(
        self,
        claude: AnthropicAdapter,
        gemini: GeminiAdapter,
        executor: ToolExecutor,
        convex: ConvexClient,
        client_id: str,
        file_refs: list[dict],
    ):
        self.claude = claude
        self.gemini = gemini
        self.executor = executor
        self.convex = convex
        self.client_id = client_id
        self.file_refs = file_refs
        self.max_turns = 20

    async def run(self) -> SubAgentReport:
        await self.convex.emit_event(
            self.client_id,
            "structurer",
            "info",
            f"Starting structurer with {len(self.file_refs)} files to process",
        )

        file_summary = json.dumps(self.file_refs, indent=2, default=str)

        system = (
            "You are a structurer agent responsible for extracting and classifying content from business files.\n"
            "You have access to the following tools:\n"
            "- extract_content: Use Gemini to extract text/data from files (PDFs, images, spreadsheets)\n"
            "- classify_relevance: Classify whether extracted content is relevant to the knowledge base\n"
            "- add_contradiction: Report contradictions found between data sources\n"
            "- message_master: Send findings or questions to the master agent\n"
            "- check_forum: Search the agent forum for relevant context\n"
            "- write_to_forum: Share discoveries with other agents\n\n"
            "For each file:\n"
            "1. Extract its content using extract_content\n"
            "2. Classify its relevance using classify_relevance\n"
            "3. If you find contradicting information between files, report it with add_contradiction\n"
            "4. Share important discoveries on the forum\n"
            "5. When done processing all files, send a summary to the master via message_master\n\n"
            "Be thorough but efficient. Process each file and classify its relevance."
        )

        messages = [
            {
                "role": "user",
                "content": (
                    f"Process the following {len(self.file_refs)} files, extract their content, "
                    f"classify relevance, and report any contradictions you find.\n\n"
                    f"Files:\n{file_summary}"
                ),
            }
        ]
        tools = [get_tool_schema(t) for t in STRUCTURER_TOOLS]
        report = SubAgentReport(agent_name="structurer", source_type="mixed")

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

        await self.convex.emit_event(
            self.client_id,
            "structurer",
            "complete",
            f"Structuring complete: {len(report.findings)} findings, {len(report.contradictions)} contradictions",
        )
        return report
