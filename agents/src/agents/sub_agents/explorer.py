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
        self.max_turns = 15

    def _get_discovery_strategy(self) -> str:
        """Return source-specific discovery instructions."""
        common_ending = (
            "When you have enough information, call `report_metrics` with a `discovered_files` array "
            "listing every resource you found (include id, name, and mimeType where known)."
        )

        if self.source_type == "gmail":
            return (
                "## Discovery Strategy (Gmail)\n"
                "1. Call `GMAIL_FETCH_EMAILS` with `max_results: 5` and WITHOUT `include_payload` (metadata only).\n"
                "   This gives you subjects, senders, dates — enough to understand the mailbox.\n"
                "2. Use search queries to find business-relevant emails: `has:attachment`, `subject:facture`,\n"
                "   `subject:invoice`, `from:comptable`, `subject:bilan`.\n"
                "3. For emails that look relevant, use `GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID` to read individual messages.\n"
                "4. Check the forum for known patterns before spending time on hard problems.\n"
                f"5. {common_ending}"
            )
        elif self.source_type == "sheets":
            return (
                "## Discovery Strategy (Sheets)\n"
                "1. FIRST call `GOOGLEDRIVE_LIST_FILES` to discover available spreadsheets.\n"
                "   You can filter by mimeType `application/vnd.google-apps.spreadsheet`.\n"
                "2. THEN use `GOOGLESHEETS_BATCH_GET` with the discovered spreadsheet IDs to read their contents.\n"
                "3. Use sandbox tools (run_command, read_local_file) for local processing of downloaded data.\n"
                "4. Check the forum for known patterns before spending time on hard problems.\n"
                f"5. {common_ending}"
            )
        elif self.source_type == "drive":
            return (
                "## Discovery Strategy (Drive)\n"
                "1. Call `GOOGLEDRIVE_LIST_FILES` with no filters to see all available files.\n"
                "2. Filter by mime type to find specific file categories (PDFs, spreadsheets, documents).\n"
                "3. Use `download_file` to fetch files locally, then inspect with sandbox tools.\n"
                "4. Check the forum for known patterns before spending time on hard problems.\n"
                f"5. {common_ending}"
            )
        else:
            return (
                "## Strategy\n"
                "1. If Google Workspace tools are listed above, call them immediately — they are live and authenticated.\n"
                "2. Use sandbox tools (run_command, read_local_file) for processing files locally.\n"
                "3. Check the forum for known patterns before spending time on hard problems.\n"
                f"4. {common_ending}"
            )

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

        workspace_line = f"\nWorkspace path: {self._workspace_path}" if self._workspace_path else ""

        if google_tools:
            google_section = (
                "## Google Workspace Tools (USE THESE FIRST)\n"
                "These tools are **already authenticated** via OAuth — call them directly, they will work immediately.\n"
                "Do NOT attempt to install google libraries, look for token.json, check env vars for credentials,\n"
                "or write Python scripts to access Google APIs. The tools below ARE your Google access.\n\n"
                + "\n".join(f"  - {t}" for t in google_tools)
                + "\n"
            )
        else:
            google_section = ""

        if sandbox_tools:
            sandbox_section = (
                "\n## Sandbox Tools (for local file processing)\n"
                "Full shell available via run_command — pipes, grep, env, find, curl, python3, etc. all work.\n"
                "Use sandbox tools to process files you've downloaded or to inspect your local workspace.\n\n"
                + "\n".join(f"  - {t}" for t in sandbox_tools)
                + "\n"
            )
        else:
            sandbox_section = ""

        if utility_tools:
            utility_section = (
                "\n## Utility Tools\n"
                + "\n".join(f"  - {t}" for t in utility_tools)
                + "\n"
            )
        else:
            utility_section = ""

        return (
            f'You are an explorer agent investigating a {self.source_type} data source '
            f'labeled "{self.source_label}".\n'
            f"Auth mode: {self._auth_mode}{workspace_line}\n\n"

            f"## Goal\n"
            f"Discover what data is available in this source, understand its structure and contents, "
            f"then call report_metrics with a summary of your findings.\n\n"

            f"{google_section}"
            f"{sandbox_section}"
            f"{utility_section}\n"

            f"{self._get_discovery_strategy()}\n\n"

            f"## Rules\n"
            f"- Do NOT use `run_command` to grep for credentials, tokens, or env vars.\n"
            f"- Do NOT install google SDK packages (google-auth, google-api-python-client, etc.).\n"
            f"- Do NOT request full email bodies in bulk — fetch metadata first, then read selectively.\n"
            f"- Do NOT spend turns trying to set up authentication — it is already done."
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
                    f"Explore the {self.source_type} source '{self.source_label}'.\n"
                    f"1. List available resources first (don't read everything in detail).\n"
                    f"2. Inspect the most relevant items selectively.\n"
                    f"3. Call report_metrics with a summary AND a discovered_files array of what you found."
                ),
            }
        ]
        tools = self._tools or [get_tool_schema(t) for t in EXPLORER_TOOLS]
        logger.info(f"[{self.source_type}] tool list: {[t['name'] for t in tools]}")
        report = SubAgentReport(
            agent_name=f"explorer-{self.source_type}", source_type=self.source_type
        )

        detector = ToolLoopDetector()

        for turn in range(self.max_turns):
            text, tool_calls_raw = await self.llm.complete_with_tools_messages(
                messages, tools, system
            )

            if text:
                logger.info(f"[{self.source_type}] turn={turn} text: {text[:300]}")
            if tool_calls_raw:
                logger.info(
                    f"[{self.source_type}] turn={turn} tool calls: "
                    + ", ".join(
                        f"{tc['name']}({str(tc['input'])[:80]})" for tc in tool_calls_raw
                    )
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
