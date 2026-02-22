# Agent Pipeline

The Python agent system that explores, structures, verifies, and populates the knowledge base.

---

## Overview

```
CLI: uv run python -m agents.main --client-id <convex-id>
                    │
                    ▼
            ┌──────────────┐
            │ MasterAgent  │  Orchestrator — runs all 4 phases sequentially
            └──────┬───────┘
                   │
    ┌──────────────┼──────────────────────────┐
    │              │                          │
    ▼              ▼                          ▼
┌──────────┐ ┌──────────────┐ ┌─────────────────────┐
│ Explorer │ │  Structurer  │ │  KnowledgeWriter    │
│ Agent(s) │ │  Agent(s)    │ │  Agent              │
└──────────┘ └──────────────┘ └─────────────────────┘
  Phase 1       Phase 2            Phase 4
  Explore       Structure          Use
                     Phase 3 (Verify) is handled by MasterAgent directly
```

---

## Four Phases

### Phase 1: Explore

```
MasterAgent
    │
    ├──▶ ExplorerAgent (Gmail source)  ──┐
    ├──▶ ExplorerAgent (Drive source)  ──┤  concurrent
    └──▶ ExplorerAgent (Sheets source) ──┘
                                          │
                                     SubAgentReports
                                          │
                                     MasterAgent merges
```

Each ExplorerAgent:
1. Receives a data source (type + label)
2. Runs an agentic loop (up to 15 turns) with Claude + explorer tools
3. Lists messages/files/sheets, checks forum for prior guides
4. Reports metrics and findings via `report_metrics` tool
5. Writes new operational guides to the forum

**Tools available:** `list_gmail_messages`, `list_drive_files`, `read_sheet`, `report_metrics`, `check_forum`, `write_to_forum`

---

### Phase 2: Structure

```
MasterAgent
    │
    ├── Claude + define_knowledge_tree tool
    │   → Designs tree structure from exploration findings
    │   → Creates nodes in Convex (domain > skill > entry_group)
    │
    ├──▶ StructurerAgent (batch 1) ──┐
    └──▶ StructurerAgent (batch 2) ──┘  concurrent batches
                                      │
                                 Contradictions + findings
                                      │
                                 MasterAgent collects
```

Each StructurerAgent:
1. Receives a list of file references to process
2. Extracts content using Gemini (multimodal — PDFs, images, spreadsheets)
3. Classifies relevance using Claude
4. Flags contradictions when data conflicts
5. Messages the master with findings

**Tools available:** `extract_content`, `classify_relevance`, `add_contradiction`, `message_master`, `check_forum`, `write_to_forum`

---

### Phase 3: Verify

```
MasterAgent (no sub-agents)
    │
    ├── Claude + generate_questionnaire tool
    │   → Creates MCQs from open contradictions
    │   → Pushes questionnaire to Convex
    │
    └── Poll loop (exponential backoff: 5s → 30s)
        → Checks Convex for human responses
        → Resolves contradictions based on answers
```

This is the human-in-the-loop phase. The master agent waits for the user to answer verification questions in the dashboard UI. No sub-agents — the master handles everything.

---

### Phase 4: Use

```
MasterAgent
    │
    └──▶ KnowledgeWriterAgent
         → Iterates over tree nodes
         → Writes knowledge entries from accumulated findings
         → Flags any remaining contradictions
```

The KnowledgeWriterAgent receives the full accumulated knowledge from phases 1-3 and populates the knowledge tree with concrete entries (title, content, source reference, confidence score).

**Tools available:** `write_knowledge_entry`, `flag_contradiction`

---

## Agentic Loop Pattern

Every agent follows the same core loop:

```
Initialize: system prompt + user instruction + tools
                    │
                    ▼
            ┌──────────────┐
            │  Call Claude  │
            │  with tools   │
            └──────┬───────┘
                   │
            ┌──────┴──────┐
            │             │
      tool_calls?     no tools
            │             │
            ▼             ▼
    ┌──────────────┐   [Done]
    │   Execute    │
    │   via        │
    │   ToolExec   │
    └──────┬───────┘
           │
     Add results to
     message history
           │
           └──▶ Loop (up to max_turns)
```

**Max turns per agent:**
- ExplorerAgent: 15
- StructurerAgent: 20
- KnowledgeWriterAgent: 25
- MasterAgent: 20

---

## LLM Adapters

### AnthropicAdapter (Claude)

```python
class AnthropicAdapter:
    complete(prompt, system="") → str
    complete_messages(messages, system="") → str
    complete_with_tools(prompt, tools, system="") → (str, [tool_calls])
    complete_with_tools_messages(messages, tools, system="") → (str, [tool_calls])
```

Used for: all agentic loops, reasoning, tool calling, knowledge structuring.

### GeminiAdapter

```python
class GeminiAdapter:
    complete(prompt, system="") → str
    complete_messages(messages, system="") → str
    extract_multimodal(file_bytes, mime_type, prompt) → str
```

Used for: extracting content from PDFs, images, and spreadsheets in their native format.

---

## Tool System

### ToolDefinition → ToolExecutor

```
ToolDefinition(name, description, parameters)
         │
         ▼
get_tool_schema(tool) → Anthropic API format
         │
         ▼
ToolExecutor.register(name, handler)
         │
         ▼
ToolExecutor.execute(tool_call) → ToolResult
```

Tools are registered at runtime. Each agent type gets its own executor with specialized tools.

### Tool Interception

Some tools are intercepted at the agent level before the executor runs:

```
Claude returns tool_call: "report_metrics"
         │
         ▼
Agent intercepts → captures metrics locally (SubAgentReport)
         │
         ▼
Executor runs → persists to Convex via HTTP
```

Intercepted tools: `report_metrics`, `add_contradiction`, `message_master`

This allows agents to build local state (SubAgentReport) while also persisting data to Convex for real-time UI updates.

---

## Tool Inventory

| Agent | Tool | What It Does |
|---|---|---|
| **Explorer** | `list_gmail_messages` | Search Gmail messages by query |
| | `list_drive_files` | List files in Drive (optional folder/mime filter) |
| | `read_sheet` | Read spreadsheet data by range |
| | `report_metrics` | Capture discovery metrics (intercepted) |
| | `check_forum` | Search forum for existing guides |
| | `write_to_forum` | Write operational guide to forum |
| **Structurer** | `extract_content` | Gemini multimodal extraction from file |
| | `classify_relevance` | Claude-based relevance classification |
| | `add_contradiction` | Flag conflicting data (intercepted) |
| | `message_master` | Report findings to master (intercepted) |
| | `check_forum` | Search forum |
| | `write_to_forum` | Write guide |
| **Master** | `define_knowledge_tree` | Design tree structure (nodes) |
| | `generate_questionnaire` | Create MCQ verification form |
| | `advance_phase` | Move to next pipeline phase |
| **KnowledgeWriter** | `write_knowledge_entry` | Write entry to tree node |
| | `flag_contradiction` | Flag remaining contradictions |

---

## Convex Communication

All agent ↔ Convex communication goes through `ConvexClient` (async httpx):

```python
class ConvexClient:
    # Events
    emit_event(client_id, agent_name, event_type, message, metadata)

    # Knowledge
    create_knowledge_node(client_id, parent_id, name, type, readme, order)
    create_knowledge_entry(client_id, tree_node_id, title, content, ...)

    # Contradictions
    add_contradiction(client_id, description, source_a, source_b, ...)

    # Exploration
    upsert_exploration(client_id, data_source_id, metrics, status)

    # Forum
    search_forum(query)
    create_forum_entry(title, category, content, author_agent, tags)

    # Questionnaire
    create_questionnaire(client_id, title, questions)
    get_questionnaire_responses(client_id, questionnaire_id)

    # Pipeline
    get_pipeline(client_id)
    update_pipeline(client_id, phase, progress, active_agents)

    # Data Sources
    get_data_sources(client_id)
```

---

## File References

| File | What |
|---|---|
| `agents/src/agents/main.py` | CLI entry point |
| `agents/src/agents/master_agent.py` | Orchestrator (4 phases, tool executors) |
| `agents/src/agents/sub_agents/explorer.py` | ExplorerAgent |
| `agents/src/agents/sub_agents/structurer.py` | StructurerAgent |
| `agents/src/agents/sub_agents/knowledge_writer.py` | KnowledgeWriterAgent |
| `agents/src/agents/llm/adapters.py` | AnthropicAdapter + GeminiAdapter |
| `agents/src/agents/llm/protocols.py` | LLMProvider + ToolCapableLLM protocols |
| `agents/src/agents/llm/factory.py` | `create_llm_providers()` |
| `agents/src/agents/tools/definitions.py` | Tool schemas + tool groups |
| `agents/src/agents/tools/executor.py` | ToolExecutor registry |
| `agents/src/agents/storage/convex_client.py` | Async HTTP client for Convex |
| `agents/src/agents/storage/context.py` | PipelineState + SubAgentReport |
| `agents/src/agents/integrations/google_workspace.py` | Gmail/Drive/Sheets client |
| `agents/src/agents/integrations/forum.py` | Forum client wrapper |
| `agents/src/agents/config/settings.py` | Pydantic settings |
