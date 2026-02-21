import logging
import json

from ..llm.adapters import AnthropicAdapter
from ..tools.definitions import ToolCall, EXPLORER_TOOLS, get_tool_schema
from ..tools.hybrid_executor import HybridToolExecutor
from ..storage.convex_client import ConvexClient
from ..storage.context import SubAgentReport

logger = logging.getLogger(__name__)


class ExplorerAgent:
    def __init__(
        self,
        llm: AnthropicAdapter,
        executor: HybridToolExecutor,
        convex: ConvexClient,
        client_id: str,
        source_type: str,
        source_label: str,
        tools: list[dict] | None = None,
    ):
        self.llm = llm
        self.executor = executor
        self.convex = convex
        self.client_id = client_id
        self.source_type = source_type
        self.source_label = source_label
        self._tools = tools
        self.max_turns = 15

    async def run(self) -> SubAgentReport:
        await self.convex.emit_event(
            self.client_id,
            f"explorer-{self.source_type}",
            "info",
            f"Starting exploration of {self.source_label}",
        )

        system = (
            f'You are an explorer agent investigating a {self.source_type} data source labeled "{self.source_label}".\n'
            f"Your goal is to discover what data is available, understand its structure, and report metrics.\n"
            f"Be thorough but efficient. Use the tools to explore, then call report_metrics with your findings."
        )

        messages = [
            {
                "role": "user",
                "content": f"Explore the {self.source_type} source '{self.source_label}' and report what you find.",
            }
        ]
        tools = self._tools or [get_tool_schema(t) for t in EXPLORER_TOOLS]
        report = SubAgentReport(
            agent_name=f"explorer-{self.source_type}", source_type=self.source_type
        )

        for turn in range(self.max_turns):
            text, tool_calls_raw = await self.llm.complete_with_tools_messages(
                messages, tools, system
            )

            if not tool_calls_raw:
                # No more tool calls, agent is done
                break

            # Add assistant response to messages
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

                # Intercept report_metrics to capture in report
                if call.name == "report_metrics":
                    report.metrics = call.input
                    report.findings.append(call.input.get("summary", ""))
                    await self.convex.emit_event(
                        self.client_id,
                        f"explorer-{self.source_type}",
                        "progress",
                        f"Metrics: {json.dumps(call.input)}",
                    )
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": call.id,
                            "content": "Metrics recorded.",
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
            f"explorer-{self.source_type}",
            "complete",
            f"Exploration complete: {report.metrics.get('summary', 'done')}",
        )
        return report
