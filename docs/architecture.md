# Architecture

System architecture, data model, and communication patterns.

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
│    KnowledgeTree, ContradictionsList, QuestionCard,          │
│    KnowledgeEntry, Layout                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ Convex client SDK
                           │ (real-time subscriptions)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Convex)                           │
│                                                              │
│  convex/*.ts — 32 functions across 10 files                  │
│  convex/schema.ts — 11 tables with indexes                   │
│  convex/http.ts — 11 HTTP endpoints for agent bridge         │
│                                                              │
│  Public functions ← Frontend queries/mutations               │
│  Internal functions ← HTTP endpoints ← Agent pipeline        │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP + Bearer token
                           │ (11 REST endpoints)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  AGENT PIPELINE (Python)                      │
│                                                              │
│  MasterAgent → ExplorerAgent(s) → StructurerAgent(s)         │
│             → KnowledgeWriterAgent                           │
│                                                              │
│  Claude (orchestration) + Gemini (multimodal extraction)     │
│  Google Workspace APIs (Gmail, Drive, Sheets)                │
└─────────────────────────────────────────────────────────────┘
```

---

## Auth Flow

```
User → WorkOS AuthKit (login/SSO)
         │
         ▼
AuthKitProvider (React context)
         │
         ▼
ConvexProviderWithAuthKit (custom bridge)
  │ Extracts: isLoading, user, getAccessToken
  │ Transforms to: Convex-compatible auth object
  │
  ▼
ConvexProviderWithAuth → Convex backend (JWT validation)
```

Provider chain in `src/main.tsx`:
```
ErrorBoundary → AuthKitProvider → ConvexProviderWithAuthKit → App
```

---

## Data Model (11 Tables)

```
clients
  │ phase: onboard | explore | structure | verify | use
  │ index: by_createdBy
  │
  ├── data_sources
  │     type: gmail | drive | sheets
  │     connectionStatus: pending | connected | error
  │     index: by_clientId
  │
  ├── explorations
  │     metrics (per data source)
  │     status: running | completed | failed
  │     indexes: by_clientId, by_clientId_and_dataSourceId
  │
  ├── contradictions
  │     sourceA vs sourceB, valueA vs valueB
  │     status: open | resolved | dismissed
  │     indexes: by_clientId, by_clientId_and_status
  │
  ├── questionnaires
  │     questions[] with options
  │     status: draft | sent | completed
  │     index: by_clientId
  │     │
  │     └── questionnaire_responses
  │           selectedOption per questionId
  │           indexes: by_questionnaireId, by_questionnaireId_and_questionId
  │
  ├── knowledge_tree
  │     hierarchical: parentId → self-referencing
  │     type: domain | skill | entry_group
  │     indexes: by_clientId, by_clientId_and_parentId
  │     │
  │     └── knowledge_entries
  │           confidence (0-1), verified (bool)
  │           indexes: by_clientId, by_treeNodeId
  │
  ├── pipeline_status
  │     currentPhase, phaseProgress (%), activeAgents[]
  │     index: by_clientId
  │
  └── agent_events
        agentName, eventType, message
        eventType: info | progress | warning | error | complete
        index: by_clientId

forum_entries (global, not per-client)
  category, authorAgent, tags[], upvotes
  index: by_category
  searchIndex: search_content (full-text on content)
```

---

## HTTP Endpoint Map (Agent Bridge)

All endpoints in `convex/http.ts`, authenticated via `Bearer AGENT_AUTH_TOKEN`.

### POST endpoints (write operations)

| Endpoint | Convex Function | Purpose |
|---|---|---|
| `/api/agent/event` | `internal.agentEvents.emit` | Log agent activity |
| `/api/agent/contradiction` | `internal.contradictions.add` | Flag a data contradiction |
| `/api/agent/exploration` | `internal.explorations.upsert` | Update exploration metrics |
| `/api/agent/knowledge/node` | `internal.knowledge.createNode` | Create a tree node |
| `/api/agent/knowledge/entry` | `internal.knowledge.createEntry` | Write a knowledge entry |
| `/api/agent/forum/create` | `internal.forum.create` | Write a forum guide |
| `/api/agent/forum/search` | `internal.forum.search` | Search forum (full-text) |
| `/api/agent/questionnaire/create` | `internal.questionnaires.create` | Create verification questionnaire |
| `/api/agent/pipeline/update` | `internal.pipeline.update` | Update phase progress |

### GET endpoints (read operations)

| Endpoint | Convex Function | Purpose |
|---|---|---|
| `/api/agent/data-sources?clientId=` | `internal.dataSources.internalListByClient` | List client's data sources |
| `/api/agent/questionnaire/responses?questionnaireId=` | `internal.questionnaires.internalGetResponses` | Poll for human responses |
| `/api/agent/pipeline?clientId=` | `internal.pipeline.get` | Get current pipeline state |

---

## Frontend Routing

No client-side router — page state managed via `useState<Page>` in `App.tsx`.

```
App
├── Unauthenticated → LandingPage (sign-in CTA)
└── Authenticated → Layout
    ├── page.type === 'dashboard' → Dashboard
    └── page.type === 'client'   → ClientDetail
        └── client.phase determines which panel renders:
            ├── onboard   → OnboardPanel
            ├── explore   → ExplorePanel
            ├── structure → StructurePanel
            ├── verify    → VerifyPanel
            └── use       → UsePanel
```

---

## Real-Time Data Flow

```
Python Agent                    Convex                     React Frontend
     │                            │                              │
     │── POST /api/agent/event ──▶│                              │
     │                            │── agent_events table ───────▶│ AgentEventFeed
     │                            │   (reactive subscription)    │ (auto-scroll)
     │                            │                              │
     │── POST /knowledge/node ──▶│                              │
     │                            │── knowledge_tree table ─────▶│ KnowledgeTree
     │                            │   (reactive subscription)    │ (live update)
     │                            │                              │
     │── POST /contradiction ───▶│                              │
     │                            │── contradictions table ─────▶│ ContradictionsList
     │                            │   (reactive subscription)    │ (live update)
     │                            │                              │
     │── POST /pipeline/update ─▶│                              │
     │                            │── pipeline_status table ────▶│ ExploreMetrics
     │                            │   (reactive subscription)    │ (progress bar)
```

Everything the agents write appears in the UI within milliseconds via Convex's reactive queries. No polling on the frontend side.
