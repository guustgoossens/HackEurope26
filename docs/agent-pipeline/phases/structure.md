# Phase 2: Structure

## What Happens

Two steps: MasterAgent designs the knowledge tree, then spawns `StructurerAgent`s to extract and classify content.

```
MasterAgent
    │
    ├── Step 1: Tree Design
    │   Claude + define_knowledge_tree tool
    │   → reads exploration findings from Phase 1
    │   → creates domain/skill/entry_group nodes in Convex
    │
    └── Step 2: Structurers (concurrent batches)
        ├──▶ StructurerAgent (batch 1) ──┐
        └──▶ StructurerAgent (batch 2) ──┘
                                         │
                                    Contradictions + findings
                                         │
                                    MasterAgent collects into state.open_contradictions
```

## Tree Design Step

MasterAgent calls Claude with the Phase 1 SubAgentReports as context and asks it to design a knowledge tree. Claude responds with `define_knowledge_tree` tool call containing node definitions:

```python
{
  "nodes": [
    {"name": "Finance", "type": "domain", "order": 0, "readme": "..."},
    {"name": "Tax Compliance", "type": "skill", "parent_name": "Finance", "order": 0},
    {"name": "VAT Filings 2024", "type": "entry_group", "parent_name": "Tax Compliance", "order": 0},
  ]
}
```

Nodes are written to the `knowledge_tree` Convex table immediately — the tree appears in the UI as it's being designed.

## Structurer Loop (per agent)

Each structurer receives a batch of file references to process:
1. Extract content via Gemini (`extract_content` tool)
2. Classify relevance with Claude (`classify_relevance`)
3. Flag contradictions (`add_contradiction` — intercepted into local state + Convex)
4. Write operational guides to forum
5. Report findings to master (`message_master` — intercepted)

Max turns: **20**

## Outputs

- Knowledge tree nodes in Convex (`knowledge_tree` table)
- Contradictions in Convex (`contradictions` table) + in `state.open_contradictions`
- Forum entries with structured extraction tips
- `SubAgentReport`s with findings and messages
