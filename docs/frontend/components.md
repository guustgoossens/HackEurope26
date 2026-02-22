# Components

---

## Pages

### Dashboard (`src/pages/Dashboard.tsx`)
- Client grid + inline create form
- Convex hooks: `useQuery(api.clients.list)`, `useMutation(api.clients.create)`
- Renders phase badge per client

### ClientDetail (`src/pages/ClientDetail.tsx`)
- Phase-aware panel routing (5 panels)
- Convex hooks: `useQuery(api.clients.get)`, `useQuery(api.dataSources.listByClient)`, `useMutation(api.dataSources.create)`, `useMutation(api.clients.updatePhase)`
- Contains pipeline trigger (direct HTTP fetch to agent server)

---

## Phase Panels (rendered inside ClientDetail)

| Panel | Phase | Key Features |
|-------|-------|-------------|
| OnboardPanel | onboard | Data source list, add source form, "Start Exploration" button |
| ExplorePanel | explore | ExploreMetrics, source list, AgentEventFeed |
| StructurePanel | structure | KnowledgeTree + ContradictionsList, KnowledgeEntryList |
| VerifyPanel | verify | QuestionCard loop, ContradictionsList, AgentEventFeed |
| UsePanel | use | KnowledgeTree (1/3) + KnowledgeEntryList (2/3) |

---

## Reusable Components

### Layout (`src/components/Layout.tsx`)
- Props: `children`, `onNavigateHome`
- WorkOS `useAuth()` for user info
- Sidebar (logo, nav, user info) + content area

### PhaseIndicator (`src/components/PhaseIndicator.tsx`)
- Props: `currentPhase`
- No Convex hooks
- Horizontal stepper: Explore → Structure → Verify → Use

### AgentEventFeed (`src/components/AgentEventFeed.tsx`)
- Props: `clientId`
- Convex: `useQuery(api.agentEvents.listByClient)`
- Real-time scrolling event list, color-coded by eventType

### ExploreMetrics (`src/components/ExploreMetrics.tsx`)
- Props: `clientId`
- Convex: `useQuery(api.pipeline.getByClient)`
- 3-card grid: progress bar, active agents count, last activity

### KnowledgeTree (`src/components/KnowledgeTree.tsx`)
- Props: `clientId`, `onSelectNode?`, `selectedNodeId?`
- Convex: `useQuery(api.knowledge.getTree)`
- Recursive expandable tree with type icons (domain/skill/entry_group)
- Clicking a node fires `onSelectNode` → updates `selectedNodeId`

### ContradictionsList (`src/components/ContradictionsList.tsx`)
- Props: `clientId`
- Convex: `useQuery(api.contradictions.listByClient)`, `useMutation(api.contradictions.resolve)`, `useMutation(api.contradictions.dismiss)`
- Contradiction cards with inline resolve/dismiss

### QuestionCard (`src/components/QuestionCard.tsx`)
- Props: `questionnaireId`, `question`, `existingResponse?`
- Convex: `useMutation(api.questionnaires.respond)`
- MCQ radio buttons with immediate submission on click

### KnowledgeEntryList (rendered inline in StructurePanel/UsePanel)
- Props: `treeNodeId`
- Convex: `useQuery(api.knowledge.listEntriesByNode)`
- Entry cards with confidence %, verified badge, source reference
