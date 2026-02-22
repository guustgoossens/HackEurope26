import asyncio
import json
import logging
import os

from .llm.adapters import AnthropicAdapter, GeminiAdapter
from .tools.definitions import MASTER_TOOLS, EXPLORER_TOOLS, SANDBOX_TOOLS, get_tool_schema, ToolCall
from .tools.executor import ToolExecutor
from .tools.hybrid_executor import HybridToolExecutor
from .storage.convex_client import ConvexClient
from .storage.context import PipelineState
from .sub_agents.explorer import ExplorerAgent
from .sub_agents.structurer import StructurerAgent
from .sub_agents.knowledge_writer import KnowledgeWriterAgent
from .integrations.google_workspace import GoogleWorkspaceClient
from .integrations.composio_client import ComposioIntegration
from .sandbox import SandboxFileManager, CommandExecutor

logger = logging.getLogger(__name__)


class MasterAgent:
    def __init__(
        self,
        claude: AnthropicAdapter,
        gemini: GeminiAdapter,
        convex: ConvexClient,
        google: GoogleWorkspaceClient | None,
        client_id: str,
        composio: ComposioIntegration | None = None,
        composio_user_prefix: str = "hackeurope26",
        verify_timeout: int = 300,
    ):
        self.claude = claude
        self.gemini = gemini
        self.convex = convex
        self.google = google
        self.client_id = client_id
        self.composio = composio
        self.composio_user_id = f"{composio_user_prefix}_{client_id}" if composio else ""
        self.state = PipelineState(client_id=client_id)
        self.max_turns = 20
        self.verify_timeout = verify_timeout
        self.file_manager = SandboxFileManager()
        self.command_executor = CommandExecutor()

    # ── Sandbox tool registration (workspace-isolated closures) ────

    def _register_sandbox_tools(self, executor: ToolExecutor, workspace_path: str) -> None:
        """Register sandbox tools as closures that capture a specific workspace path."""
        file_manager = self.file_manager
        command_executor = self.command_executor
        google = self.google

        async def download_file(file_id: str, filename: str | None = None) -> str:
            file_bytes = google.read_drive_file(file_id)
            if not filename:
                files = google.list_drive_files()
                filename = file_id
                for f in files:
                    if f.get("id") == file_id:
                        filename = f.get("name", file_id)
                        break
            filepath = file_manager.stage_file(workspace_path, filename, file_bytes)
            mime_type = file_manager.detect_mime(filepath)
            return json.dumps({
                "path": filepath, "filename": filename,
                "size_bytes": len(file_bytes), "mime_type": mime_type,
            })

        async def run_command(command: str, timeout: int = 60) -> str:
            result = await command_executor.run_command(command, workspace_path, timeout)
            output = ""
            if result["stdout"]:
                output += result["stdout"]
            if result["stderr"]:
                output += f"\n[stderr] {result['stderr']}"
            if not result["success"]:
                if result["return_code"] == -1:
                    raise RuntimeError(f"Command blocked by sandbox: {result['stderr']}")
                output = f"[exit code {result['return_code']}] {output}"
            if len(output) > 10000:
                output = output[:10000] + "\n... (truncated)"
            return output.strip() or "(no output)"

        async def read_local_file(filepath: str, max_chars: int = 50000) -> str:
            resolved = filepath
            if not os.path.isabs(resolved):
                resolved = os.path.join(workspace_path, resolved)
            if not file_manager.validate_path(resolved, workspace_path):
                raise ValueError("Filepath is outside the workspace")
            return file_manager.read_file_text(resolved, max_chars)

        async def list_workspace() -> str:
            files = file_manager.list_files(workspace_path)
            if not files:
                return "Workspace is empty."
            return json.dumps(files, indent=2)

        async def install_package(package: str) -> str:
            result = await command_executor.run_command(
                f"uv pip install --system {package}", workspace_path, timeout=120,
            )
            if result["success"]:
                return f"Successfully installed {package}"
            raise RuntimeError(f"Failed to install {package}: {result['stderr']}")

        executor.register("download_file", download_file)
        executor.register("run_command", run_command)
        executor.register("read_local_file", read_local_file)
        executor.register("list_workspace", list_workspace)
        executor.register("install_package", install_package)

    def _make_extract_content(self, workspace_path: str):
        """Factory returning a closure for the structurer's extract_content tool."""
        file_manager = self.file_manager
        google = self.google
        gemini = self.gemini

        async def extract_content(file_id: str, extraction_prompt: str) -> str:
            file_bytes = None
            mime_type = "application/pdf"

            workspace_files = file_manager.list_files(workspace_path)
            for wf in workspace_files:
                if file_id in wf.get("path", ""):
                    file_bytes = file_manager.read_file(wf["absolute_path"])
                    mime_type = wf.get("mime_type", mime_type)
                    break

            if file_bytes is None:
                file_bytes = google.read_drive_file(file_id)
                files = google.list_drive_files()
                for f in files:
                    if f.get("id") == file_id:
                        mime_type = f.get("mimeType", "application/pdf")
                        break

            result = await gemini.extract_multimodal(file_bytes, mime_type, extraction_prompt)
            return result

        return extract_content

    # ── Explorer tool executor ──────────────────────────────────────

    def _build_explorer_executor(self, workspace_path: str) -> HybridToolExecutor:
        executor = ToolExecutor()
        # Only register custom Google tools if Composio is not active
        if not self.composio:
            executor.register("list_gmail_messages", self._tool_list_gmail)
            executor.register("list_drive_files", self._tool_list_drive)
            executor.register("read_sheet", self._tool_read_sheet)
        executor.register("check_forum", self._tool_check_forum)
        executor.register("write_to_forum", self._tool_write_forum)
        # Sandbox tools — isolated to this workspace
        self._register_sandbox_tools(executor, workspace_path)
        return HybridToolExecutor(
            custom_executor=executor,
            composio=self.composio,
            composio_user_id=self.composio_user_id,
        )

    def _get_explorer_tools(self, executor: HybridToolExecutor, source_type: str) -> list[dict]:
        """Get tool schemas for one explorer agent, scoped to its source type."""
        sandbox_schemas = [get_tool_schema(t) for t in SANDBOX_TOOLS]
        if self.composio:
            custom_only = [
                t for t in EXPLORER_TOOLS
                if t.name not in ("list_gmail_messages", "list_drive_files", "read_sheet")
            ]
            custom_schemas = [get_tool_schema(t) for t in custom_only] + sandbox_schemas
            return executor.get_tools_for_source(source_type, custom_schemas)
        # Non-Composio path: include only the custom Google tool for this source
        source_google_tool = {"gmail": "list_gmail_messages", "drive": "list_drive_files", "sheets": "read_sheet"}
        relevant = source_google_tool.get(source_type)
        tools = [t for t in EXPLORER_TOOLS if not t.name in ("list_gmail_messages", "list_drive_files", "read_sheet") or t.name == relevant]
        return [get_tool_schema(t) for t in tools] + sandbox_schemas

    async def _tool_list_gmail(
        self, query: str = "", max_results: int = 20
    ) -> str:
        # Let exceptions propagate — ToolExecutor catches them and sets is_error=True
        messages = self.google.list_gmail_messages(query, max_results)
        return json.dumps(messages, indent=2)

    async def _tool_list_drive(
        self, folder_id: str | None = None, mime_type: str | None = None
    ) -> str:
        files = self.google.list_drive_files(folder_id, mime_type)
        return json.dumps(files, indent=2)

    async def _tool_read_sheet(self, spreadsheet_id: str, range: str) -> str:
        data = self.google.read_sheet(spreadsheet_id, range)
        return json.dumps(data, indent=2)

    async def _tool_check_forum(
        self,
        query: str,
        source_type: str | None = None,
        phase: str | None = None,
        file_type: str | None = None,
    ) -> str:
        results = await self.convex.search_forum(
            query, source_type=source_type, phase=phase, file_type=file_type
        )
        return json.dumps(results, indent=2) if results else "No forum entries found."

    async def _tool_write_forum(
        self,
        title: str,
        category: str,
        content: str,
        tags: list[str] | None = None,
        source_type: str | None = None,
        phase: str | None = None,
        file_type: str | None = None,
    ) -> str:
        await self.convex.create_forum_entry(
            title, category, content, "explorer", tags or [],
            source_type=source_type, phase=phase, file_type=file_type,
        )
        return "Forum entry created."

    # ── Structurer tool executor ────────────────────────────────────

    def _build_structurer_executor(self, workspace_path: str) -> ToolExecutor:
        executor = ToolExecutor()
        executor.register("extract_content", self._make_extract_content(workspace_path))
        executor.register("classify_relevance", self._tool_classify_relevance)
        executor.register("add_contradiction", self._tool_add_contradiction)
        executor.register("message_master", self._tool_message_master)
        executor.register("check_forum", self._tool_check_forum)
        executor.register("write_to_forum", self._tool_write_forum_structurer)
        # Sandbox tools — isolated to this workspace
        self._register_sandbox_tools(executor, workspace_path)
        return executor

    async def _tool_classify_relevance(
        self, content: str, context: str
    ) -> str:
        prompt = (
            f"Classify the relevance of the following content to a business knowledge base.\n\n"
            f"Business context: {context}\n\n"
            f"Content to classify:\n{content[:3000]}\n\n"
            f"Respond with a JSON object containing:\n"
            f'- "relevance": "high", "medium", or "low"\n'
            f'- "category": the business category this belongs to\n'
            f'- "key_facts": array of key facts extracted\n'
            f'- "reasoning": brief explanation of relevance rating'
        )
        result = await self.claude.complete(
            prompt,
            system="You are a business data classifier. Respond only with valid JSON."
        )
        return result

    async def _tool_add_contradiction(
        self,
        description: str,
        source_a: str,
        source_b: str,
        value_a: str,
        value_b: str,
    ) -> str:
        result = await self.convex.add_contradiction(
            self.client_id, description, source_a, source_b, value_a, value_b
        )
        # Also track locally in pipeline state
        self.state.open_contradictions.append(
            {
                "description": description,
                "source_a": source_a,
                "source_b": source_b,
                "value_a": value_a,
                "value_b": value_b,
                "id": result.get("id", "") if result else "",
            }
        )
        return "Contradiction recorded."

    async def _tool_message_master(self, message: str) -> str:
        logger.info(f"Sub-agent message to master: {message}")
        await self.convex.emit_event(
            self.client_id,
            "structurer",
            "info",
            f"Sub-agent message: {message[:300]}",
        )
        return "Message received by master."

    async def _tool_write_forum_structurer(
        self,
        title: str,
        category: str,
        content: str,
        tags: list[str] | None = None,
        source_type: str | None = None,
        phase: str | None = None,
        file_type: str | None = None,
    ) -> str:
        await self.convex.create_forum_entry(
            title, category, content, "structurer", tags or [],
            source_type=source_type, phase=phase, file_type=file_type,
        )
        return "Forum entry created."


    # ── Knowledge writer tool executor ──────────────────────────────

    def _build_knowledge_writer_executor(self) -> ToolExecutor:
        executor = ToolExecutor()
        executor.register("write_knowledge_entry", self._tool_write_knowledge_entry)
        executor.register("flag_contradiction", self._tool_flag_contradiction)
        return executor

    async def _tool_write_knowledge_entry(
        self,
        tree_node_id: str,
        title: str,
        content: str,
        confidence: float,
        source_ref: str = "",
    ) -> str:
        result = await self.convex.create_knowledge_entry(
            client_id=self.client_id,
            tree_node_id=tree_node_id,
            title=title,
            content=content,
            source_ref=source_ref,
            confidence=confidence,
            verified=False,
        )
        entry_id = result.get("id", "unknown") if result else "unknown"
        return f"Knowledge entry created: {entry_id}"

    async def _tool_flag_contradiction(
        self,
        description: str,
        source_a: str,
        source_b: str,
        value_a: str,
        value_b: str,
    ) -> str:
        await self.convex.add_contradiction(
            self.client_id, description, source_a, source_b, value_a, value_b
        )
        self.state.open_contradictions.append(
            {
                "description": description,
                "source_a": source_a,
                "source_b": source_b,
                "value_a": value_a,
                "value_b": value_b,
            }
        )
        return "Contradiction flagged."

    # ══════════════════════════════════════════════════════════════════
    #  Phase 1: Explore
    # ══════════════════════════════════════════════════════════════════

    async def run_explore_phase(self, data_sources: list[dict]):
        """Run the explore phase: spawn explorer agents per data source."""
        await self.convex.update_pipeline(self.client_id, "explore", 0, ["master"])
        await self.convex.emit_event(
            self.client_id,
            "master",
            "info",
            f"Starting explore phase with {len(data_sources)} data sources",
        )

        auth_mode = "Composio (OAuth)" if self.composio else "service account"

        # Create explorer agents, each with its own workspace and executor
        explorers = []
        explorer_workspaces = []
        for ds in data_sources:
            ws = self.file_manager.create_workspace(f"{self.client_id}_{ds['type']}")
            explorer_workspaces.append(ws)
            executor = self._build_explorer_executor(ws)
            tools = self._get_explorer_tools(executor, ds["type"])
            agent = ExplorerAgent(
                llm=self.claude,
                executor=executor,
                convex=self.convex,
                client_id=self.client_id,
                source_type=ds["type"],
                source_label=ds["label"],
                tools=tools,
                tool_names=[t["name"] for t in tools],
                auth_mode=auth_mode,
                workspace_path=ws,
            )
            explorers.append(agent)

        # Run explorers concurrently
        active_agents = [f"explorer-{ds['type']}" for ds in data_sources]
        await self.convex.update_pipeline(
            self.client_id, "explore", 10, ["master"] + active_agents
        )

        reports = await asyncio.gather(
            *[e.run() for e in explorers], return_exceptions=True
        )

        # Clean up per-explorer workspaces
        for ws in explorer_workspaces:
            self.file_manager.cleanup(ws)

        for report in reports:
            if isinstance(report, Exception):
                logger.error(f"Explorer failed: {report}")
                continue
            self.state.add_report(report)
            await self.convex.upsert_exploration(
                self.client_id,
                next(
                    ds["_id"]
                    for ds in data_sources
                    if ds["type"] == report.source_type
                ),
                report.metrics,
                "completed",
            )

        await self.convex.update_pipeline(self.client_id, "explore", 100, ["master"])
        await self.convex.emit_event(
            self.client_id,
            "master",
            "complete",
            f"Explore phase complete. {len(self.state.sub_agent_reports)} sources explored.",
        )

        return self.state

    # ══════════════════════════════════════════════════════════════════
    #  Phase 2: Structure
    # ══════════════════════════════════════════════════════════════════

    async def run_structure_phase(self):
        """Run the structure phase: design knowledge tree and process files."""
        await self.convex.update_pipeline(
            self.client_id, "structure", 0, ["master"]
        )
        await self.convex.emit_event(
            self.client_id, "master", "info", "Starting structure phase"
        )

        # Step 1: Use Claude to design the knowledge tree based on explorer reports
        state_summary = self.state.get_summary()
        reports_detail = ""
        all_file_refs = []
        for report in self.state.sub_agent_reports:
            reports_detail += f"\n--- {report.agent_name} ({report.source_type}) ---\n"
            reports_detail += f"Metrics: {json.dumps(report.metrics, indent=2, default=str)}\n"
            reports_detail += f"Findings: {json.dumps(report.findings, indent=2, default=str)}\n"
            # Collect file references from metrics for structurer sub-agents
            if isinstance(report.metrics, dict):
                # Explorer reports may include file lists in metrics
                for key in ("files", "file_list", "discovered_files"):
                    if key in report.metrics and isinstance(report.metrics[key], list):
                        all_file_refs.extend(report.metrics[key])

        system = (
            "You are the master orchestration agent for building a company knowledge base.\n"
            "Based on the exploration reports below, design a knowledge tree structure.\n"
            "Use the define_knowledge_tree tool to create the tree.\n"
            "The tree should have domain nodes (top level), skill nodes (categories), "
            "and entry_group nodes (leaf groups for actual entries).\n"
            "Make the tree comprehensive but not overly deep (max 3 levels).\n"
            "Base the structure on what was actually discovered in the data."
        )

        messages = [
            {
                "role": "user",
                "content": (
                    f"Design a knowledge tree for this client based on exploration results.\n\n"
                    f"Pipeline state:\n{state_summary}\n\n"
                    f"Detailed reports:\n{reports_detail}\n\n"
                    f"Use define_knowledge_tree to create the tree structure."
                ),
            }
        ]

        # Use only the define_knowledge_tree tool from MASTER_TOOLS
        tree_tool_def = next(t for t in MASTER_TOOLS if t.name == "define_knowledge_tree")
        tools = [get_tool_schema(tree_tool_def)]

        await self.convex.update_pipeline(
            self.client_id, "structure", 20, ["master"]
        )

        # Agentic loop for tree design
        tree_nodes_created = []
        for turn in range(self.max_turns):
            text, tool_calls_raw = await self.claude.complete_with_tools_messages(
                messages, tools, system
            )

            if not tool_calls_raw:
                break

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

            tool_results = []
            for tc in tool_calls_raw:
                call = ToolCall(id=tc["id"], name=tc["name"], input=tc["input"])

                if call.name == "define_knowledge_tree":
                    nodes = call.input.get("nodes", [])
                    # Create nodes in Convex, tracking parent relationships
                    node_id_map = {}  # name -> convex ID
                    for node in nodes:
                        parent_id = None
                        parent_name = node.get("parent_name")
                        if parent_name and parent_name in node_id_map:
                            parent_id = node_id_map[parent_name]

                        result = await self.convex.create_knowledge_node(
                            client_id=self.client_id,
                            parent_id=parent_id,
                            name=node["name"],
                            type=node["type"],
                            readme=node.get("readme", ""),
                            order=node.get("order", 0),
                        )
                        node_convex_id = result.get("id", "") if result else ""
                        node_id_map[node["name"]] = node_convex_id
                        tree_nodes_created.append(
                            {
                                "id": node_convex_id,
                                "name": node["name"],
                                "type": node["type"],
                                "parent_name": parent_name,
                            }
                        )

                    self.state.knowledge_tree_draft = tree_nodes_created
                    await self.convex.emit_event(
                        self.client_id,
                        "master",
                        "progress",
                        f"Knowledge tree created with {len(nodes)} nodes",
                    )
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": call.id,
                            "content": f"Knowledge tree created with {len(nodes)} nodes: {json.dumps([n['name'] for n in nodes])}",
                        }
                    )
                else:
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": call.id,
                            "content": f"Unknown tool: {call.name}",
                            "is_error": True,
                        }
                    )

            messages.append({"role": "user", "content": tool_results})

        await self.convex.update_pipeline(
            self.client_id, "structure", 50, ["master", "structurer"]
        )

        # Step 2: Spawn structurer sub-agents to process discovered files
        # If no file refs were collected from metrics, create a default list
        # based on what the explorers found
        if not all_file_refs:
            # Build file refs from report findings as a fallback
            for report in self.state.sub_agent_reports:
                all_file_refs.append(
                    {
                        "source_type": report.source_type,
                        "agent_name": report.agent_name,
                        "findings": report.findings,
                        "metrics": report.metrics,
                    }
                )

        if all_file_refs:
            # Split files into batches for parallel processing
            batch_size = max(1, len(all_file_refs) // 3)
            batches = [
                all_file_refs[i : i + batch_size]
                for i in range(0, len(all_file_refs), batch_size)
            ]

            structurers = []
            structurer_workspaces = []
            for i, batch in enumerate(batches):
                ws = self.file_manager.create_workspace(f"{self.client_id}_structurer_{i}")
                structurer_workspaces.append(ws)
                structurer_executor = self._build_structurer_executor(ws)
                agent = StructurerAgent(
                    claude=self.claude,
                    gemini=self.gemini,
                    executor=structurer_executor,
                    convex=self.convex,
                    client_id=self.client_id,
                    file_refs=batch,
                )
                structurers.append(agent)

            structurer_reports = await asyncio.gather(
                *[s.run() for s in structurers], return_exceptions=True
            )

            # Clean up per-structurer workspaces
            for ws in structurer_workspaces:
                self.file_manager.cleanup(ws)

            for report in structurer_reports:
                if isinstance(report, Exception):
                    logger.error(f"Structurer failed: {report}")
                    continue
                self.state.add_report(report)
                # Collect contradictions from structurer reports
                for contradiction in report.contradictions:
                    if contradiction not in self.state.open_contradictions:
                        self.state.open_contradictions.append(contradiction)

        await self.convex.update_pipeline(
            self.client_id, "structure", 100, ["master"]
        )
        await self.convex.emit_event(
            self.client_id,
            "master",
            "complete",
            f"Structure phase complete. {len(tree_nodes_created)} tree nodes, "
            f"{len(self.state.open_contradictions)} contradictions found.",
        )

    # ══════════════════════════════════════════════════════════════════
    #  Phase 3: Verify
    # ══════════════════════════════════════════════════════════════════

    async def run_verify_phase(self):
        """Run the verify phase: generate questionnaire from contradictions."""
        await self.convex.update_pipeline(self.client_id, "verify", 0, ["master"])
        await self.convex.emit_event(
            self.client_id, "master", "info", "Starting verify phase"
        )

        contradictions = self.state.open_contradictions
        if not contradictions:
            await self.convex.emit_event(
                self.client_id,
                "master",
                "info",
                "No contradictions to verify -- skipping questionnaire generation",
            )
            await self.convex.update_pipeline(
                self.client_id, "verify", 100, ["master"]
            )
            return

        # Step 1: Use Claude to generate a verification questionnaire
        contradictions_summary = json.dumps(contradictions, indent=2, default=str)

        system = (
            "You are the master orchestration agent. You need to generate a verification questionnaire "
            "for a human reviewer to resolve contradictions found in the company data.\n"
            "Use the generate_questionnaire tool to create a set of multiple-choice questions.\n"
            "Each question should clearly present the contradiction and offer options for resolution.\n"
            "Include an option for 'I don't know' or 'Both are correct in different contexts' when appropriate."
        )

        messages = [
            {
                "role": "user",
                "content": (
                    f"Generate a verification questionnaire for the following {len(contradictions)} contradictions.\n\n"
                    f"Contradictions:\n{contradictions_summary}\n\n"
                    f"Use generate_questionnaire to create the questions."
                ),
            }
        ]

        questionnaire_tool_def = next(
            t for t in MASTER_TOOLS if t.name == "generate_questionnaire"
        )
        tools = [get_tool_schema(questionnaire_tool_def)]

        await self.convex.update_pipeline(
            self.client_id, "verify", 20, ["master"]
        )

        questionnaire_id = None
        for turn in range(self.max_turns):
            text, tool_calls_raw = await self.claude.complete_with_tools_messages(
                messages, tools, system
            )

            if not tool_calls_raw:
                break

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

            tool_results = []
            for tc in tool_calls_raw:
                call = ToolCall(id=tc["id"], name=tc["name"], input=tc["input"])

                if call.name == "generate_questionnaire":
                    title = call.input.get("title", "Verification Questionnaire")
                    raw_questions = call.input.get("questions", [])

                    # Transform questions to Convex format
                    questions = []
                    for i, q in enumerate(raw_questions):
                        formatted = {
                            "id": f"q{i+1}",
                            "text": q.get("text", ""),
                            "options": q.get("options", []),
                        }
                        if q.get("contradiction_id"):
                            formatted["contradictionId"] = q["contradiction_id"]
                        questions.append(formatted)

                    result = await self.convex.create_questionnaire(
                        client_id=self.client_id,
                        title=title,
                        questions=questions,
                    )
                    questionnaire_id = result.get("id", "") if result else None

                    await self.convex.emit_event(
                        self.client_id,
                        "master",
                        "progress",
                        f"Questionnaire created with {len(questions)} questions (id: {questionnaire_id})",
                    )
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": call.id,
                            "content": f"Questionnaire created with {len(questions)} questions. ID: {questionnaire_id}",
                        }
                    )
                else:
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": call.id,
                            "content": f"Unknown tool: {call.name}",
                            "is_error": True,
                        }
                    )

            messages.append({"role": "user", "content": tool_results})

        await self.convex.update_pipeline(
            self.client_id, "verify", 50, ["master"]
        )

        # Step 2: Wait for human responses (simplified for hackathon)
        if questionnaire_id:
            await self.convex.emit_event(
                self.client_id,
                "master",
                "info",
                "Waiting for human verification responses...",
            )

            # Poll with exponential backoff
            wait_interval = 5
            total_waited = 0
            max_wait = self.verify_timeout
            responses = []

            while total_waited < max_wait:
                await asyncio.sleep(wait_interval)
                total_waited += wait_interval

                responses = await self.convex.get_questionnaire_responses(
                    self.client_id, questionnaire_id
                )
                if responses:
                    await self.convex.emit_event(
                        self.client_id,
                        "master",
                        "progress",
                        f"Received {len(responses)} human responses",
                    )
                    break

                # Exponential backoff (cap at 15s intervals)
                wait_interval = min(wait_interval * 2, 15)

            # Step 3: Resolve contradictions based on responses
            if responses:
                for resp in responses:
                    contradiction_id = resp.get("contradiction_id")
                    chosen_answer = resp.get("answer", "")
                    if contradiction_id:
                        logger.info(
                            f"Resolving contradiction {contradiction_id}: {chosen_answer}"
                        )
                        # Remove from open contradictions
                        self.state.open_contradictions = [
                            c
                            for c in self.state.open_contradictions
                            if c.get("id") != contradiction_id
                        ]
            else:
                await self.convex.emit_event(
                    self.client_id,
                    "master",
                    "info",
                    "No human responses received within timeout -- continuing with unresolved contradictions",
                )

        await self.convex.update_pipeline(
            self.client_id, "verify", 100, ["master"]
        )
        await self.convex.emit_event(
            self.client_id,
            "master",
            "complete",
            f"Verify phase complete. {len(self.state.open_contradictions)} contradictions remain open.",
        )

    # ══════════════════════════════════════════════════════════════════
    #  Phase 4: Use
    # ══════════════════════════════════════════════════════════════════

    async def run_use_phase(self):
        """Run the use phase: write knowledge entries."""
        await self.convex.update_pipeline(self.client_id, "use", 0, ["master"])
        await self.convex.emit_event(
            self.client_id, "master", "info", "Starting use phase -- writing knowledge entries"
        )

        tree_nodes = self.state.knowledge_tree_draft
        if not tree_nodes:
            await self.convex.emit_event(
                self.client_id,
                "master",
                "info",
                "No tree nodes available -- skipping knowledge writing",
            )
            await self.convex.update_pipeline(
                self.client_id, "use", 100, ["master"]
            )
            return

        # Build accumulated knowledge summary from all reports
        accumulated_knowledge_parts = []
        for report in self.state.sub_agent_reports:
            accumulated_knowledge_parts.append(
                f"=== {report.agent_name} ({report.source_type}) ===\n"
                f"Metrics: {json.dumps(report.metrics, indent=2, default=str)}\n"
                f"Findings:\n" + "\n".join(f"  - {f}" for f in report.findings)
            )
        accumulated_knowledge = "\n\n".join(accumulated_knowledge_parts)

        # Spawn knowledge writer agent
        writer_executor = self._build_knowledge_writer_executor()
        writer = KnowledgeWriterAgent(
            llm=self.claude,
            executor=writer_executor,
            convex=self.convex,
            client_id=self.client_id,
            tree_nodes=tree_nodes,
            accumulated_knowledge=accumulated_knowledge,
        )

        await self.convex.update_pipeline(
            self.client_id, "use", 20, ["master", "knowledge-writer"]
        )

        result = await writer.run()

        await self.convex.update_pipeline(self.client_id, "use", 100, ["master"])
        await self.convex.emit_event(
            self.client_id,
            "master",
            "complete",
            f"Use phase complete. {result.get('entries_written', 0)} knowledge entries written.",
        )

    # ══════════════════════════════════════════════════════════════════
    #  Run full pipeline
    # ══════════════════════════════════════════════════════════════════

    async def run(self, data_sources: list[dict]):
        """Run the full pipeline."""
        await self.run_explore_phase(data_sources)
        await self.run_structure_phase()
        await self.run_verify_phase()
        await self.run_use_phase()
