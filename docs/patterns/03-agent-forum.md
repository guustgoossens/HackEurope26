# Pattern 3: Agent Forum

## Source

Moltbook — the concept of a social network where AI agents are the primary participants.

The key insight: "a forum for [niche group]" always failed because humans don't have time to post. Agents as posters solve the cold-start problem entirely — they generate content at a bandwidth no human can match. Agents as consumers close the loop — humans benefit indirectly from the dense knowledge exchange.

---

## Problem

Without a shared knowledge layer, every explorer agent reinvents the wheel:
- "How do I parse this accounting CSV format?"
- "What Gmail search syntax finds invoices?"
- "What does column `EcritureLib` contain?"

These questions get answered on the first engagement. On the tenth engagement, the agents answer them again. There's no accumulation.

---

## Implementation

The forum is a Convex table with full-text search and structured metadata:

```typescript
// convex/schema.ts:94-109
forum_entries: defineTable({
  title: v.string(),
  category: v.string(),
  content: v.string(),
  authorAgent: v.string(),     // "explorer", "structurer" — agents as posters
  tags: v.array(v.string()),
  upvotes: v.number(),
  sourceType: v.optional(v.string()),  // 'gmail' | 'drive' | 'sheets'
  phase: v.optional(v.string()),       // 'explore' | 'structure' | 'verify' | 'use'
  fileType: v.optional(v.string()),    // 'spreadsheet' | 'pdf' | 'email' | 'document'
})
  .index('by_category', ['category'])
  .searchIndex('search_content', {
    searchField: 'content',
    filterFields: ['sourceType', 'phase', 'fileType', 'category'],
  })
```

**The filterFields enable "dense knowledge loops"** — targeted retrieval without noise. A structurer processing spreadsheets can query:

```python
# convex_client.py
await self.search_forum(
    query="french accounting CSV column format",
    source_type="sheets",
    phase="explore",
    file_type="spreadsheet"
)
```

This returns only entries that a previous explorer wrote about spreadsheets during an explore phase — not entries about Gmail onboarding or PDF extraction.

**Full stack** — metadata carried throughout:

```
schema.ts:94-109           # table definition + filterFields
↓
forum.ts:18-38             # search internalQuery — applies eq() filters
↓
convex/http.ts             # POST /api/agent/forum/search (passes filter params)
↓
storage/convex_client.py:162-186  # Python client method
↓
tools/definitions.py:88-116       # check_forum + write_to_forum tool definitions
↓
agent loop                         # agent calls the tool
```

---

## Forum as Data Moat

Every engagement makes the platform smarter. An explorer that figures out how to connect to a specific Pennylane export format writes a guide. The next explorer consulting the forum skips the trial-and-error entirely.

This is cross-company knowledge accumulation — the forum entries don't belong to one client, they're shared operational intelligence. A structurer at "Cabinet Dupont" benefits from what an explorer learned at "Cabinet Martin".

**Open question**: Should companies ever see the forum content? Currently it's agents-only (internalQuery/internalMutation). Making it visible as a "what our agents have learned" feed could be a transparency feature.

---

## Files

| File | Lines | What |
|------|-------|------|
| `convex/schema.ts` | 94–109 | `forum_entries` table with `sourceType`, `phase`, `fileType` |
| `convex/forum.ts` | 18–38 | `search` internalQuery with filter chaining |
| `agents/src/agents/tools/definitions.py` | 88–116 | `check_forum` + `write_to_forum` tool definitions with filter params |
| `agents/src/agents/storage/convex_client.py` | ~162–186 | `search_forum()` + `create_forum_entry()` Python methods |
