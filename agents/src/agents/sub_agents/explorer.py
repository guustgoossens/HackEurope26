import logging
import json

from ..llm.adapters import AnthropicAdapter
from ..tools.definitions import ToolCall, EXPLORER_TOOLS, get_tool_schema
from ..tools.hybrid_executor import HybridToolExecutor
from ..tools.loop_detection import ToolLoopDetector
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
        tool_names: list[str] | None = None,
        auth_mode: str = "composio",
        workspace_path: str | None = None,
    ):
        self.llm = llm
        self.executor = executor
        self.convex = convex
        self.client_id = client_id
        self.source_type = source_type
        self.source_label = source_label
        self._tools = tools
        self._tool_names = tool_names or []
        self._auth_mode = auth_mode
        self._workspace_path = workspace_path
        self.max_turns = 10

    def _build_system_prompt(self) -> str:
        # Categorize tools for clear presentation
        google_tools = [
            n for n in self._tool_names
            if any(n.upper().startswith(p) for p in ("GMAIL_", "GOOGLEDRIVE_", "GOOGLESHEETS_"))
        ]
        sandbox_tools = [
            n for n in self._tool_names
            if n in ("download_file", "run_command", "read_local_file", "list_workspace", "install_package")
        ]
        utility_tools = [
            n for n in self._tool_names
            if n not in google_tools and n not in sandbox_tools
        ]

        tool_section = ""
        if google_tools:
            tool_section += "Google Workspace (auth pre-configured):\n"
            for t in google_tools:
                tool_section += f"  - {t}\n"
            tool_section += "\n"
        if sandbox_tools:
            tool_section += "Sandbox (local file processing):\n"
            for t in sandbox_tools:
                tool_section += f"  - {t}\n"
            tool_section += "\n"
        if utility_tools:
            tool_section += "Utility:\n"
            for t in utility_tools:
                tool_section += f"  - {t}\n"
            tool_section += "\n"

        workspace_line = f" | workspace: {self._workspace_path}" if self._workspace_path else ""

        return (
            f'You are an explorer agent investigating a {self.source_type} data source '
            f'labeled "{self.source_label}".\n\n'

            f"## Goal\n"
            f"Discover what data is available, understand its structure, report findings via report_metrics.\n\n"

            f"## Environment\n"
            f"auth: {self._auth_mode}{workspace_line} | sandbox: allowlisted commands\n"
            f"Google Workspace access is pre-configured — the Google tools below have authentication handled.\n\n"

            f"## Available Tools\n"
            f"{tool_section}"

            f"When done, call report_metrics with a summary of what you found."
        )

    async def run(self) -> SubAgentReport:
        await self.convex.emit_event(
            self.client_id,
            f"explorer-{self.source_type}",
            "info",
            f"Starting exploration of {self.source_label}",
        )

        system = self._build_system_prompt()

        messages = [
            {
                "role": "user",
                "content": (
                    f"Explore the {self.source_type} source '{self.source_label}' and report what you find."
                ),
            }
        ]
        tools = self._tools or [get_tool_schema(t) for t in EXPLORER_TOOLS]
        report = SubAgentReport(
            agent_name=f"explorer-{self.source_type}", source_type=self.source_type
        )

        detector = ToolLoopDetector()

        for turn in range(self.max_turns):
            text, tool_calls_raw = await self.llm.complete_with_tools_messages(
                messages, tools, system
            )

            if not tool_calls_raw:
                break

            # Build assistant content block
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
                            "content": "Metrics recorded. Exploration complete.",
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
                logger.warning(
                    f"Explorer {self.source_type}: loop detected, breaking"
                )
                break

        await self.convex.emit_event(
            self.client_id,
            f"explorer-{self.source_type}",
            "complete",
            f"Exploration complete: {report.metrics.get('summary', 'done')}",
        )
        return report
