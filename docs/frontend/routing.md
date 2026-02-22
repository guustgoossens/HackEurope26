# Routing

No client-side router library — page state is managed via `useState<Page>` in `App.tsx`.

---

## Page State

```typescript
// App.tsx
type Page = { type: 'dashboard' } | { type: 'client'; clientId: Id<'clients'> };
const [page, setPage] = useState<Page>({ type: 'dashboard' });
```

Navigation is done by calling `setPage()` — no URL changes. This keeps the app simple for a hackathon context.

---

## Component Tree

```
App
├── Unauthenticated → LandingPage (sign-in CTA)
└── Authenticated → Layout (sidebar + content)
    ├── page.type === 'dashboard' → Dashboard
    └── page.type === 'client'   → ClientDetail
        └── client.phase determines panel:
            ├── 'onboard'   → OnboardPanel
            ├── 'explore'   → ExplorePanel
            ├── 'structure' → StructurePanel
            ├── 'verify'    → VerifyPanel
            └── 'use'       → UsePanel
```

---

## Phase → Panel Mapping

`ClientDetail.tsx` reads `client.phase` from Convex and renders the appropriate panel:

| Phase | Panel | What It Shows |
|-------|-------|---------------|
| `onboard` | OnboardPanel | Data source list, add source form, "Start Exploration" button |
| `explore` | ExplorePanel | ExploreMetrics (progress), data source list, AgentEventFeed |
| `structure` | StructurePanel | KnowledgeTree + ContradictionsList side-by-side, KnowledgeEntryList |
| `verify` | VerifyPanel | QuestionCard loop, ContradictionsList, AgentEventFeed |
| `use` | UsePanel | 1/3 KnowledgeTree + 2/3 KnowledgeEntryList |

The phase advances when `clients.updatePhase` is called. The agent pipeline calls this via the Convex HTTP endpoint when each phase completes — the UI panel switches automatically because `client.phase` changes in the reactive query.

---

## Pipeline Trigger

The "Start Exploration" button in OnboardPanel calls:

```typescript
// ClientDetail.tsx
await fetch(`${import.meta.env.VITE_AGENT_SERVER_URL}/run`, {
  method: 'POST',
  body: JSON.stringify({ clientId }),
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ...' },
});
```

This is a direct HTTP call to the Python agent server — not a Convex action. See [architecture/realtime-flow.md](../architecture/realtime-flow.md) for rationale.
