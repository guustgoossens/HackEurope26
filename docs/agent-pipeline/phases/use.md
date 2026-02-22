# Phase 4: Use

## What Happens

`KnowledgeWriterAgent` receives the full accumulated knowledge from phases 1–3 and populates the knowledge tree with concrete entries.

```
MasterAgent
    │
    └──▶ KnowledgeWriterAgent
         → receives: tree nodes (from Phase 2), findings (from all phases),
                     resolved contradictions (from Phase 3)
         → iterates over leaf nodes (entry_group type)
         → writes knowledge_entries with title, content, confidence, source_ref
         → flags any residual contradictions found during writing
```

## Knowledge Writer Loop

1. Receive context: tree structure + all SubAgentReport findings
2. For each leaf node in the tree — call `write_knowledge_entry`
3. If new contradiction discovered during writing — `flag_contradiction`
4. Continue until all nodes processed or max turns reached

Max turns: **25**

## What Gets Written

Each `write_knowledge_entry` call creates a `knowledge_entries` record:

```python
{
  "tree_node_id": "<id of entry_group node>",
  "title": "VAT Rate for Standard Services",
  "content": "Standard VAT rate applied to all service invoices is 20%...",
  "source_ref": "sheets/Comptabilité_2024.xlsx:Sheet1!B12",
  "confidence": 0.95
}
```

`confidence` reflects how certain the agent is (0–1). `verified` is initially `false` — can be confirmed by human review later.

## Outputs

- `knowledge_entries` records in Convex, attached to leaf nodes
- Any residual contradictions added to `contradictions` table
- Pipeline status updated to `use` phase complete
- Final `complete` event emitted to `agent_events`

## After Use Phase

The knowledge base is now queryable via `knowledge.getTree(clientId)` and `knowledge.listEntriesByNode(nodeId)`. Any future agent can navigate from domain → skill → entry_group → entries, reading READMEs at each level to understand context before drilling in.
