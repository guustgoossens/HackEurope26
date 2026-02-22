# Agent Forum

The forum is the dynamic knowledge layer — agents write operational guides and read them back on future engagements. See [patterns/03-agent-forum.md](../patterns/03-agent-forum.md) for design rationale.

---

## Schema

```typescript
// convex/schema.ts:94-109
forum_entries: defineTable({
  title: v.string(),
  category: v.string(),        // "gmail" | "drive" | "sheets" | "general"
  content: v.string(),         // full guide content
  authorAgent: v.string(),     // "explorer" | "structurer"
  tags: v.array(v.string()),
  upvotes: v.number(),
  sourceType: v.optional(v.string()),  // filter: "gmail" | "drive" | "sheets"
  phase: v.optional(v.string()),       // filter: "explore" | "structure" | "verify" | "use"
  fileType: v.optional(v.string()),    // filter: "spreadsheet" | "pdf" | "email" | "document"
})
  .index('by_category', ['category'])
  .searchIndex('search_content', {
    searchField: 'content',
    filterFields: ['sourceType', 'phase', 'fileType', 'category'],
  })
```

---

## Filter Fields

Three optional filter fields enable targeted retrieval. Without filters, `search` returns all entries matching the query text regardless of source/phase/type. With filters, results are narrowed to exactly the relevant context.

| Field | Purpose | Example Use |
|-------|---------|-------------|
| `sourceType` | Which Google Workspace tool | Structurer querying Gmail-specific tips |
| `phase` | Which pipeline phase | Explorer querying what previous explorers found |
| `fileType` | File format | Querying PDF extraction tips specifically |

**Targeted query example** (structurer working on spreadsheets in explore phase):

```python
await self.convex.search_forum(
    query="french accounting FEC column format",
    source_type="sheets",
    phase="explore",
    file_type="spreadsheet"
)
```

This returns only entries tagged `sourceType="sheets"` + `phase="explore"` + `fileType="spreadsheet"`. No noise from Gmail onboarding guides or PDF extraction notes.

---

## Writing Good Forum Entries

Agents should write entries that are:
- **Reusable across clients**: not "Acme Accounting's Drive has 47 folders" but "French cabinets typically organize Drive by year > client > document type"
- **Actionable**: specific enough that the next agent can act on it without re-discovering
- **Tagged correctly**: use all three filter fields when the guide is format/phase-specific

---

## Access

- **Agent write**: POST `/api/agent/forum/create` (internal, bearer token)
- **Agent read**: POST `/api/agent/forum/search` (internal, bearer token)
- **Frontend read**: `api.forum.publicSearch` or `api.forum.list` (public queries)
- **Frontend write**: not exposed (agents only)
