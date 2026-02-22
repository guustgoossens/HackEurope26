# Pattern 5: Navigable Knowledge Tree (Skill Distillation)

## Source

Skill distillation concept: rather than compressing all knowledge into model weights, build an external navigable library that small models retrieve from at inference time. The knowledge tree is this primitive — a hierarchical, referenced skill library that any future agent can query.

Related inspiration: HiREC (hierarchical retrieval for financial QA) — hierarchical structures consistently outperform flat vector search on complex document-heavy domains.

---

## Problem

Flat RAG (chunked embeddings + similarity search) has two failure modes in complex domains:

1. **Similarity ≠ relevance**: "Q3 revenue" matches dozens of fragments. Which is authoritative? Which is from a draft? Which was superseded?
2. **Context collapse**: a 500-token chunk doesn't know it's under "Finance > Tax Compliance > VAT" — the hierarchy gives it meaning, and chunking destroys that hierarchy.

A new agent arriving at an SME with a flat vector store is like a consultant with a pile of unsorted papers. A new agent with the knowledge tree is like a consultant with a well-organized filing cabinet with folder labels.

---

## Implementation

### Schema

```typescript
// convex/schema.ts:71-92
knowledge_tree: defineTable({
  clientId: v.id('clients'),
  parentId: v.optional(v.id('knowledge_tree')),  // self-referencing hierarchy
  name: v.string(),
  type: v.union(v.literal('domain'), v.literal('skill'), v.literal('entry_group')),
  readme: v.optional(v.string()),   // navigation hint
  order: v.number(),
})
  .index('by_clientId', ['clientId'])
  .index('by_clientId_and_parentId', ['clientId', 'parentId'])

knowledge_entries: defineTable({
  clientId: v.id('clients'),
  treeNodeId: v.id('knowledge_tree'),
  title: v.string(),
  content: v.string(),
  sourceRef: v.optional(v.string()),   // where this came from
  confidence: v.number(),              // 0.0 – 1.0
  verified: v.boolean(),               // human-confirmed
})
  .index('by_clientId', ['clientId'])
  .index('by_treeNodeId', ['treeNodeId'])
```

### Three-Level Hierarchy

```
domain          (e.g. "Finance")
  └── skill     (e.g. "Tax Compliance")
        └── entry_group  (e.g. "VAT Filings 2024")
                  └── knowledge_entries  (concrete facts + source refs)
```

**The `readme` field on each node** acts as a navigation hint — the same way a skill library describes what each skill contains so the retrieval agent knows when to request it. An agent navigating the tree reads the domain README, decides whether to drill in, then reads the skill README, etc. Progressive disclosure without context overload.

**Confidence scores** let consumers filter: `confidence > 0.9` returns only high-certainty entries. `verified: false` entries can be flagged for human review.

**Source references** (`sourceRef`) make every claim traceable back to the original document. An agent citing a VAT rate can point to the exact spreadsheet row it came from.

### How Agents Navigate It

Phase 4 (Use phase): the KnowledgeWriterAgent iterates over tree nodes and populates entries using the accumulated findings from phases 1–3. The structurer has already classified what belongs where — the writer just fills it in.

Future use: any agent querying the KB reads `knowledge.getTree(clientId)` to get the flat node list, then traverses by `parentId` to build the path. The `readme` at each level tells it whether to descend.

---

## Why This Beats Flat RAG

| | Flat RAG | Knowledge Tree |
|---|---|---|
| Query type | Similarity search | Structural navigation |
| Context | Lost in chunking | Preserved in hierarchy |
| Authority | All chunks equal | `confidence` + `verified` fields |
| Traceability | Often none | `sourceRef` on every entry |
| Inspectability | Black box | Human-readable tree |
| Agent UX | Pile of results to sort | Navigable from top to leaf |

---

## Files

| File | Lines | What |
|------|-------|------|
| `convex/schema.ts` | 71–92 | `knowledge_tree` + `knowledge_entries` tables |
| `convex/knowledge.ts` | — | `createNode`, `createEntry`, `getTree`, `listChildren` |
| `agents/src/agents/tools/definitions.py` | ~199–255 | `define_knowledge_tree`, `write_knowledge_entry` tools |
| `agents/src/agents/sub_agents/knowledge_writer.py` | — | KnowledgeWriterAgent |
| `src/components/KnowledgeTree.tsx` | — | Recursive tree viewer |
