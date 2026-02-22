import asyncio
import logging
import json

from .llm.adapters import AnthropicAdapter, GeminiAdapter
from .tools.definitions import MASTER_TOOLS, EXPLORER_TOOLS, get_tool_schema, ToolCall
from .tools.executor import ToolExecutor
from .tools.hybrid_executor import HybridToolExecutor
from .storage.convex_client import ConvexClient
from .storage.context import PipelineState
from .sub_agents.explorer import ExplorerAgent
from .sub_agents.structurer import StructurerAgent
from .sub_agents.knowledge_writer import KnowledgeWriterAgent
from .integrations.google_workspace import GoogleWorkspaceClient
from .integrations.composio_client import ComposioIntegration

logger = logging.getLogger(__name__)


class MasterAgent:
    def __init__(
        self,
        claude: AnthropicAdapter,
        gemini: GeminiAdapter,
        convex: ConvexClient,
        google: GoogleWorkspaceClient,
        client_id: str,
        composio: ComposioIntegration | None = None,
        composio_user_prefix: str = "hackeurope26",
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

    # ── Explorer tool executor ──────────────────────────────────────

    def _build_explorer_executor(self) -> HybridToolExecutor:
        executor = ToolExecutor()
        # Only register custom Google tools if Composio is not active
        if not self.composio:
            executor.register("list_gmail_messages", self._tool_list_gmail)
            executor.register("list_drive_files", self._tool_list_drive)
            executor.register("read_sheet", self._tool_read_sheet)
        executor.register("check_forum", self._tool_check_forum)
        executor.register("write_to_forum", self._tool_write_forum)
        return HybridToolExecutor(
            custom_executor=executor,
            composio=self.composio,
            composio_user_id=self.composio_user_id,
        )

    def _get_explorer_tools(self) -> list[dict]:
        """Get merged tool schemas for explorer agents."""
        if self.composio:
            # Use Composio Google tools + only custom non-Google tools
            custom_only = [
                t for t in EXPLORER_TOOLS
                if t.name not in ("list_gmail_messages", "list_drive_files", "read_sheet")
            ]
            custom_schemas = [get_tool_schema(t) for t in custom_only]
            hybrid = self._build_explorer_executor()
            return hybrid.get_merged_tools(custom_schemas)
        return [get_tool_schema(t) for t in EXPLORER_TOOLS]

    async def _tool_list_gmail(
        self, query: str = "", max_results: int = 20
    ) -> str:
        try:
            messages = self.google.list_gmail_messages(query, max_results)
            return json.dumps(messages, indent=2)
        except Exception as e:
            return f"Error listing Gmail: {e}"

    async def _tool_list_drive(
        self, folder_id: str | None = None, mime_type: str | None = None
    ) -> str:
        try:
            files = self.google.list_drive_files(folder_id, mime_type)
            return json.dumps(files, indent=2)
        except Exception as e:
            return f"Error listing Drive: {e}"

    async def _tool_read_sheet(self, spreadsheet_id: str, range: str) -> str:
        try:
            data = self.google.read_sheet(spreadsheet_id, range)
            return json.dumps(data, indent=2)
        except Exception as e:
            return f"Error reading sheet: {e}"

    async def _tool_check_forum(self, query: str) -> str:
        results = await self.convex.search_forum(query)
        return json.dumps(results, indent=2) if results else "No forum entries found."

    async def _tool_write_forum(
        self,
        title: str,
        category: str,
        content: str,
        tags: list[str] | None = None,
    ) -> str:
        await self.convex.create_forum_entry(
            title, category, content, "explorer", tags or []
        )
        return "Forum entry created."

    # ── Structurer tool executor ────────────────────────────────────

    def _build_structurer_executor(self) -> ToolExecutor:
        executor = ToolExecutor()
        executor.register("extract_content", self._tool_extract_content)
        executor.register("classify_relevance", self._tool_classify_relevance)
        executor.register("add_contradiction", self._tool_add_contradiction)
        executor.register("message_master", self._tool_message_master)
        executor.register("check_forum", self._tool_check_forum)
        executor.register("write_to_forum", self._tool_write_forum_structurer)
        return executor

    async def _tool_extract_content(
        self, file_id: str, extraction_prompt: str
    ) -> str:
        try:
            # Download file from Google Drive
            file_bytes = self.google.read_drive_file(file_id)
            # Get file metadata to determine mime type
            files = self.google.list_drive_files()
            mime_type = "application/pdf"  # default
            for f in files:
                if f.get("id") == file_id:
                    mime_type = f.get("mimeType", "application/pdf")
                    break
            # Use Gemini multimodal extraction
            result = await self.gemini.extract_multimodal(
                file_bytes, mime_type, extraction_prompt
            )
            return result
        except Exception as e:
            logger.error(f"Content extraction failed for {file_id}: {e}")
            return f"Error extracting content: {e}"

    async def _tool_classify_relevance(
        self, content: str, context: str
    ) -> str:
        try:
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
        except Exception as e:
            return f"Error classifying relevance: {e}"

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
    ) -> str:
        await self.convex.create_forum_entry(
            title, category, content, "structurer", tags or []
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
        try:
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
        except Exception as e:
            return f"Error writing knowledge entry: {e}"

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

        executor = self._build_explorer_executor()
        tools = self._get_explorer_tools()

        # Create explorer agents
        explorers = []
        for ds in data_sources:
            agent = ExplorerAgent(
                llm=self.claude,
                executor=executor,
                convex=self.convex,
                client_id=self.client_id,
                source_type=ds["type"],
                source_label=ds["label"],
                tools=tools,
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
            structurer_executor = self._build_structurer_executor()

            # Split files into batches for parallel processing
            batch_size = max(1, len(all_file_refs) // 3)
            batches = [
                all_file_refs[i : i + batch_size]
                for i in range(0, len(all_file_refs), batch_size)
            ]

            structurers = []
            for batch in batches:
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

            # Poll with exponential backoff: check every 5s, up to 30s total
            wait_interval = 5
            total_waited = 0
            max_wait = 30
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
