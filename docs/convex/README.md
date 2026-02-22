# Convex

The backend layer: schema, functions, and HTTP endpoints.

For detailed Convex rules and API patterns, see `.claude/convex_rules.mdc`.

---

## Sub-Docs

| Doc | What |
|-----|------|
| [functions.md](./functions.md) | All 32 Convex functions mapped to tables |
| [forum.md](./forum.md) | Forum table deep-dive: schema, filter fields, query patterns |

---

## Key Conventions

- **Always use new function syntax** with `args` + `returns` validators
- **Never use `filter`** — define indexes and use `withIndex`
- **Internal vs public**: `internalQuery`/`internalMutation` for agent-only, `query`/`mutation` for frontend
- Auto-generated types in `convex/_generated/` — never edit these
- Schema defined in `convex/schema.ts`, functions in `convex/*.ts`

See `.claude/convex_rules.mdc` for complete rules and examples.
