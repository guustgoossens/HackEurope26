# Architecture

System design, data model, and communication patterns.

---

## Three-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
│                                                              │
│  Dashboard ← useQuery → Convex reactive subscriptions        │
│  ClientDetail ← useMutation → Convex mutations               │
│                                                              │
│  Pages: Dashboard, ClientDetail (5 phase panels)             │
│  Components: PhaseIndicator, AgentEventFeed, ExploreMetrics, │
│    KnowledgeTree, ContradictionsList, KnowledgeEntry, Layout │
└──────────────────────────┬──────────────────────────────────┘
                           │ Convex client SDK
                           │ (real-time subscriptions)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Convex)                           │
│                                                              │
│  convex/*.ts — functions across 10 files                      │
│  convex/schema.ts — 11 tables with indexes                   │
│  convex/http.ts — 12 HTTP endpoints for agent bridge         │
│                                                              │
│  Public functions ← Frontend queries/mutations               │
│  Internal functions ← HTTP endpoints ← Agent pipeline        │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP + Bearer token
                           │ (12 REST endpoints)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  AGENT PIPELINE (Python)                      │
│                                                              │
│  MasterAgent → ExplorerAgent(s) → StructurerAgent(s)         │
│             → KnowledgeWriterAgent                           │
│                                                              │
│  Claude (orchestration) + Gemini (multimodal extraction)     │
│  Composio (pre-connected Google Workspace tools)             │
└─────────────────────────────────────────────────────────────┘
```

---

## Sub-Docs

| Doc | What |
|-----|------|
| [data-model.md](./data-model.md) | All 11 Convex tables with fields and indexes |
| [http-api.md](./http-api.md) | All 12 HTTP endpoints with request/response shapes |
| [auth.md](./auth.md) | WorkOS → Convex JWT auth flow |
| [realtime-flow.md](./realtime-flow.md) | How agents write to Convex and UI updates in real-time |
| [scalability.md](./scalability.md) | Why this architecture scales across hundreds of data sources |
