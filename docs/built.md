# What's Been Built

Full inventory of the system as implemented.

---

## Project Structure

```
HackEurope26/
├── convex/                 # Convex backend (12 files + schema)
│   ├── schema.ts           # 11 tables with indexes
│   ├── http.ts             # 11 HTTP endpoints for agent bridge
│   ├── clients.ts          # Client CRUD + phase management
│   ├── dataSources.ts      # Data source connections
│   ├── explorations.ts     # Exploration metrics
│   ├── contradictions.ts   # Contradiction tracking
│   ├── questionnaires.ts   # Verification questionnaires
│   ├── knowledge.ts        # Knowledge tree + entries
│   ├── forum.ts            # Agent forum (full-text search)
│   ├── pipeline.ts         # Pipeline status tracking
│   ├── agentEvents.ts      # Agent activity log
│   ├── seed.ts             # Demo data seeder
│   └── _generated/         # Auto-generated types (don't edit)
├── src/                    # React frontend
│   ├── main.tsx            # Entry point + provider chain
│   ├── App.tsx             # Router + layout
│   ├── ConvexProviderWithAuthKit.tsx  # WorkOS ↔ Convex bridge
│   ├── pages/
│   │   ├── Dashboard.tsx   # Client list + create
│   │   └── ClientDetail.tsx # Phase-aware client view (5 panels)
│   └── components/
│       ├── Layout.tsx          # Sidebar + content wrapper
│       ├── PhaseIndicator.tsx  # Visual phase stepper
│       ├── AgentEventFeed.tsx  # Real-time agent activity
│       ├── ExploreMetrics.tsx  # Pipeline progress cards
│       ├── KnowledgeTree.tsx   # Recursive tree viewer
│       ├── ContradictionsList.tsx  # Contradiction manager
│       ├── QuestionCard.tsx    # MCQ response card
│       └── KnowledgeEntry.tsx  # Knowledge entry viewer
└── agents/                 # Python agent pipeline (uv project)
    └── src/agents/
        ├── main.py             # CLI entry point
        ├── master_agent.py     # Orchestrator (4 phases)
        ├── config/settings.py  # Pydantic settings
        ├── llm/
        │   ├── adapters.py     # AnthropicAdapter + GeminiAdapter
        │   ├── protocols.py    # LLMProvider + ToolCapableLLM
        │   └── factory.py      # create_llm_providers()
        ├── tools/
        │   ├── definitions.py  # Tool schemas (17 tools across 4 groups)
        │   └── executor.py     # ToolExecutor registry
        ├── storage/
        │   ├── convex_client.py  # Async HTTP client (13 methods)
        │   └── context.py        # PipelineState + SubAgentReport
        ├── integrations/
        │   ├── google_workspace.py  # Gmail + Drive + Sheets
        │   └── forum.py            # Forum wrapper
        └── sub_agents/
            ├── explorer.py         # ExplorerAgent
            ├── structurer.py       # StructurerAgent
            └── knowledge_writer.py # KnowledgeWriterAgent
```

---

## Convex Schema (11 Tables)

| Table | Fields | Indexes |
|---|---|---|
| `clients` | name, industry, phase, createdBy | `by_createdBy` |
| `data_sources` | clientId, type, label, connectionStatus | `by_clientId` |
| `explorations` | clientId, dataSourceId, metrics, status | `by_clientId`, `by_clientId_and_dataSourceId` |
| `contradictions` | clientId, description, sourceA/B, valueA/B, status, resolution? | `by_clientId`, `by_clientId_and_status` |
| `questionnaires` | clientId, title, questions[], status | `by_clientId` |
| `questionnaire_responses` | questionnaireId, questionId, selectedOption, respondedBy | `by_questionnaireId`, `by_questionnaireId_and_questionId` |
| `knowledge_tree` | clientId, parentId?, name, type, readme?, order | `by_clientId`, `by_clientId_and_parentId` |
| `knowledge_entries` | clientId, treeNodeId, title, content, sourceRef?, confidence, verified | `by_clientId`, `by_treeNodeId` |
| `forum_entries` | title, category, content, authorAgent, tags[], upvotes | `by_category`, `search_content` (full-text) |
| `pipeline_status` | clientId, currentPhase, phaseProgress, activeAgents[], lastActivity | `by_clientId` |
| `agent_events` | clientId, agentName, eventType, message, metadata? | `by_clientId` |

---

## Convex Functions (32 total)

### clients.ts

| Function | Type | Description |
|---|---|---|
| `create` | mutation | Create client in onboard phase |
| `get` | query | Fetch client by ID |
| `list` | query | List clients by creator (indexed) |
| `updatePhase` | mutation | Advance client phase |

### dataSources.ts

| Function | Type | Description |
|---|---|---|
| `create` | mutation | Add data source (pending status) |
| `listByClient` | query | List sources for client |
| `internalListByClient` | internalQuery | Same, for agent use |
| `updateStatus` | mutation | Update connection status |

### explorations.ts

| Function | Type | Description |
|---|---|---|
| `upsert` | internalMutation | Create or update exploration metrics |
| `getBySource` | query | Get exploration for a specific source |

### contradictions.ts

| Function | Type | Description |
|---|---|---|
| `add` | internalMutation | Flag a contradiction (open) |
| `resolve` | mutation | Resolve with explanation |
| `dismiss` | mutation | Dismiss contradiction |
| `listByClient` | query | All contradictions for client |
| `listOpenByClient` | query | Open contradictions only (indexed) |

### questionnaires.ts

| Function | Type | Description |
|---|---|---|
| `create` | internalMutation | Create questionnaire (draft) |
| `respond` | mutation | Submit answer to a question |
| `listByClient` | query | List questionnaires for client |
| `updateStatus` | mutation | Change questionnaire status |
| `internalGetResponses` | internalQuery | Get responses (agent polling) |
| `getWithResponses` | query | Questionnaire + all responses |

### knowledge.ts

| Function | Type | Description |
|---|---|---|
| `createNode` | internalMutation | Create tree node (domain/skill/entry_group) |
| `listChildren` | query | List child nodes of a parent |
| `createEntry` | internalMutation | Create knowledge entry under node |
| `listEntriesByNode` | query | List entries for selected node |
| `getTree` | query | Full tree for a client (flat list) |

### forum.ts

| Function | Type | Description |
|---|---|---|
| `search` | internalQuery | Full-text search on content |
| `create` | internalMutation | Create forum entry (0 upvotes) |
| `update` | mutation | Update forum entry fields |

### pipeline.ts

| Function | Type | Description |
|---|---|---|
| `get` | internalQuery | Get pipeline status (agent use) |
| `getByClient` | query | Get pipeline status (frontend) |
| `update` | internalMutation | Upsert pipeline status |

### agentEvents.ts

| Function | Type | Description |
|---|---|---|
| `emit` | internalMutation | Log an agent event |
| `listByClient` | query | Last 50 events (descending) |

### seed.ts

| Function | Type | Description |
|---|---|---|
| `seedDemoData` | internalMutation | Populate demo: Acme Accounting with 3 sources, 6 tree nodes, 3 entries, 3 contradictions, 3-question questionnaire, 18 events, 2 forum entries |

---

## HTTP Endpoints (11 Routes)

All in `convex/http.ts`, Bearer token auth.

| Method | Path | Maps To |
|---|---|---|
| POST | `/api/agent/event` | `agentEvents.emit` |
| POST | `/api/agent/contradiction` | `contradictions.add` |
| POST | `/api/agent/exploration` | `explorations.upsert` |
| POST | `/api/agent/knowledge/node` | `knowledge.createNode` |
| POST | `/api/agent/knowledge/entry` | `knowledge.createEntry` |
| POST | `/api/agent/forum/create` | `forum.create` |
| POST | `/api/agent/forum/search` | `forum.search` |
| POST | `/api/agent/questionnaire/create` | `questionnaires.create` |
| POST | `/api/agent/pipeline/update` | `pipeline.update` |
| GET | `/api/agent/data-sources` | `dataSources.internalListByClient` |
| GET | `/api/agent/questionnaire/responses` | `questionnaires.internalGetResponses` |
| GET | `/api/agent/pipeline` | `pipeline.get` |

---

## Frontend Components

### Pages

| Page | What It Renders | Convex Hooks |
|---|---|---|
| **Dashboard** | Client grid + inline create form + phase badges | `useQuery(clients.list)`, `useMutation(clients.create)` |
| **ClientDetail** | Phase-aware panel routing (5 panels) | `useQuery(clients.get)`, `useQuery(dataSources.listByClient)`, `useMutation(dataSources.create)`, `useMutation(clients.updatePhase)` |

### Phase Panels (in ClientDetail)

| Phase | Panel | Key Features |
|---|---|---|
| Onboard | OnboardPanel | Data source list, add source form, "Start Exploration" button |
| Explore | ExplorePanel | ExploreMetrics, data source list, AgentEventFeed |
| Structure | StructurePanel | KnowledgeTree + ContradictionsList side-by-side, KnowledgeEntryList |
| Verify | VerifyPanel | QuestionCard loop, ContradictionsList, AgentEventFeed |
| Use | UsePanel | 1/3 KnowledgeTree + 2/3 KnowledgeEntryList |

### Reusable Components

| Component | Props | Convex Hooks | What It Shows |
|---|---|---|---|
| **Layout** | children, onNavigateHome | WorkOS `useAuth()` | Sidebar (logo, nav, user info) + content area |
| **PhaseIndicator** | currentPhase | none | Horizontal stepper: Explore → Structure → Verify → Use |
| **AgentEventFeed** | clientId | `useQuery(agentEvents.listByClient)` | Real-time scrolling event list, color-coded by type |
| **ExploreMetrics** | clientId | `useQuery(pipeline.getByClient)` | 3-card grid: progress bar, active agents, last activity |
| **KnowledgeTree** | clientId, onSelectNode?, selectedNodeId? | `useQuery(knowledge.getTree)` | Recursive expandable tree with type icons |
| **ContradictionsList** | clientId | `useQuery(contradictions.listByClient)`, `useMutation(resolve/dismiss)` | Contradiction cards with resolve/dismiss actions |
| **QuestionCard** | questionnaireId, question, existingResponse? | `useMutation(questionnaires.respond)` | MCQ radio buttons with instant submission |
| **KnowledgeEntryList** | treeNodeId | `useQuery(knowledge.listEntriesByNode)` | Entry cards with confidence %, verified badge, source ref |

---

## Python Agent Pipeline

### Agents

| Agent | Phase | Max Turns | Tools | Output |
|---|---|---|---|---|
| ExplorerAgent | Explore | 15 | 6 (Gmail, Drive, Sheets, metrics, forum) | SubAgentReport |
| StructurerAgent | Structure | 20 | 6 (extract, classify, contradiction, master, forum) | SubAgentReport |
| KnowledgeWriterAgent | Use | 25 | 2 (write entry, flag contradiction) | {entries_written, nodes_processed} |
| MasterAgent | All | 20 | 3 (define tree, generate questionnaire, advance phase) | Full pipeline completion |

### LLM Adapters

| Adapter | Model | Capabilities |
|---|---|---|
| AnthropicAdapter | claude-sonnet-4-20250514 | complete, complete_messages, complete_with_tools, complete_with_tools_messages |
| GeminiAdapter | gemini-2.5-pro | complete, complete_messages, extract_multimodal (PDF, image, spreadsheet) |

### Dependencies (pyproject.toml)

Python >= 3.12 with: anthropic, google-generativeai, google-api-python-client, google-auth, httpx, pydantic, pydantic-settings, python-dotenv

---

## Seed Data (Demo)

The `seed.ts` script creates a realistic demo environment:

- **Client:** "Acme Accounting" (explore phase)
- **Data sources:** 3 (Gmail inbox, Google Drive shared, Client spreadsheet)
- **Knowledge tree:** 6 nodes (Financial > Tax Compliance > VAT Filings, Financial > Revenue, Operations > Client Management)
- **Knowledge entries:** 3 (VAT rates, revenue figures, client onboarding)
- **Contradictions:** 3 (Q3 revenue mismatch, VAT rate conflict, client count discrepancy)
- **Questionnaire:** 3 MCQ questions for resolving contradictions
- **Agent events:** 18 events across all types (info, progress, warning, complete)
- **Forum entries:** 2 operational guides
- **Pipeline status:** Explore phase at 45%
