# Scalability

How the architecture scales across hundreds of data sources without code changes.

---

## Concurrent Sub-Agents

Each data source spawns its own explorer agent. `asyncio.gather()` runs them in parallel. 10 sources = 10 agents running simultaneously — no code changes needed, no sequential bottleneck.

The same pattern applies to structurers: file batches are split across parallel structurer agents, each with its own workspace and tool executor.

```
MasterAgent.run_explore_phase()
  ├─ ExplorerAgent(gmail)  ─┐
  ├─ ExplorerAgent(drive)   ├─ asyncio.gather()
  └─ ExplorerAgent(sheets) ─┘
```

## Lean Context per Agent

Each agent only receives tool schemas for its specific source type. A Gmail explorer gets ~5 Gmail tools, not 50+ tools across all toolkits. This keeps LLM token usage bounded and prevents cross-source confusion.

Tool scoping happens in `_get_explorer_tools()` — Composio tools are filtered by source type, and sandbox tools are always included.

## Composio as Pluggable Tool Layer

Adding a new data source (Slack, Notion, Xero) requires one change:

```python
# composio_client.py — SOURCE_TOOLKIT mapping
SOURCE_TOOLKIT = {
    "gmail": "gmail",
    "drive": "googledrive",
    "sheets": "googlesheets",
    "slack": "slack",       # ← new
    "notion": "notion",     # ← new
}
```

No agent logic changes. Composio handles OAuth, API abstraction, and tool schema generation. The explorer agent just calls whatever tools it receives.

## Hierarchical KB over Flat RAG

The knowledge base uses a tree structure (max 3 levels: domain → skill → entry_group) instead of flat document chunks. This means retrieval can be scoped to subtrees — querying "payroll" doesn't pull in unrelated "marketing" context.

Indexes on `by_clientId_and_parentId` (knowledge_tree) and `by_clientId_and_treeNodeId` (knowledge_entries) make subtree queries fast regardless of total KB size.

## Agent Forum as Data Moat

The forum (`forum_entries` table) accumulates cross-pipeline knowledge. When a new client pipeline runs, agents check the forum for patterns already discovered by previous pipelines.

Metadata filters (`sourceType`, `phase`, `fileType`) enable targeted retrieval — a Gmail explorer only sees Gmail-related forum entries, not Drive findings.

The forum uses Convex's full-text search index with filter fields, so searches stay fast as entries accumulate across hundreds of clients.

## Sandbox Isolation

Each agent gets its own `/tmp/sandbox_*` workspace directory. Environment variables are stripped before command execution. File operations are path-validated against the workspace boundary.

This prevents cross-agent interference when running concurrently — one explorer's downloaded files can't collide with another's, and a structurer processing Drive PDFs won't overwrite a Gmail explorer's cached emails.
