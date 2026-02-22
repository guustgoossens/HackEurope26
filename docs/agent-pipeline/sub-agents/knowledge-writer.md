# KnowledgeWriterAgent

`agents/src/agents/sub_agents/knowledge_writer.py`

---

## Role

Populates the verified knowledge tree with concrete entries. Runs once in Phase 4, after contradictions are resolved. Receives all accumulated knowledge from phases 1–3.

## Constructor

```python
KnowledgeWriterAgent(
    llm: AnthropicAdapter,
    convex: ConvexClient,
    client_id: str,
    tree_nodes: list[dict],      # all knowledge_tree nodes for this client
    accumulated_findings: str,   # merged findings from all SubAgentReports
    resolved_contradictions: list[dict],  # what the human resolved
)
```

## Agentic Loop

Max turns: **25** (more than other agents — it has more entries to write).

Uses `ToolLoopDetector(repeat_threshold=3, history_size=20)`.

The writer typically:
1. Reviews the tree structure and resolved contradictions
2. Iterates over leaf nodes (`entry_group` type)
3. For each node — writes knowledge entries with title, content, confidence, source_ref
4. Flags any new contradictions found during writing (`flag_contradiction`)

## Outputs

Returns a dict:
```python
{
    "entries_written": int,
    "nodes_processed": int,
    "contradictions_flagged": int,
}
```

Unlike ExplorerAgent and StructurerAgent, KnowledgeWriterAgent doesn't return a `SubAgentReport` — it's a terminal phase.

## Tools

See [tools.md — Knowledge Writer Tools](../tools.md#knowledge-writer-tools).

Only two tools:
- `write_knowledge_entry` — the primary output action
- `flag_contradiction` — safety valve for residual contradictions
