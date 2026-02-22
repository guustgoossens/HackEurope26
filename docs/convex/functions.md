# Convex Functions

Functions across 10 files. Public functions are callable from the frontend; internal functions are called only from HTTP endpoints.

---

## clients.ts

| Function | Type | Description |
|----------|------|-------------|
| `create` | mutation | Create client in onboard phase |
| `get` | query | Fetch client by ID |
| `list` | query | List clients by creator (indexed by_createdBy) |
| `updatePhase` | mutation | Advance client to next phase |

## dataSources.ts

| Function | Type | Description |
|----------|------|-------------|
| `create` | mutation | Add data source (pending status) |
| `listByClient` | query | List sources for client |
| `internalListByClient` | internalQuery | Same, for agent HTTP endpoint |
| `updateStatus` | mutation | Update connection status |

## explorations.ts

| Function | Type | Description |
|----------|------|-------------|
| `upsert` | internalMutation | Create or update exploration metrics (agent writes) |
| `getBySource` | query | Get exploration for a specific source |

## contradictions.ts

| Function | Type | Description |
|----------|------|-------------|
| `add` | internalMutation | Flag a contradiction (status: open) |
| `resolve` | mutation | Resolve with explanation |
| `dismiss` | mutation | Dismiss contradiction |
| `listByClient` | query | All contradictions for client |
| `listOpenByClient` | query | Open contradictions only (indexed by_clientId_and_status) |

## questionnaires.ts

| Function | Type | Description |
|----------|------|-------------|
| `create` | internalMutation | Create questionnaire (draft → sent) |
| `respond` | mutation | Submit answer to a question |
| `listByClient` | query | List questionnaires for client |
| `updateStatus` | mutation | Change questionnaire status |
| `internalGetResponses` | internalQuery | Get responses (agent polling) |
| `getWithResponses` | query | Questionnaire + all responses |

## knowledge.ts

| Function | Type | Description |
|----------|------|-------------|
| `createNode` | internalMutation | Create tree node (domain/skill/entry_group) |
| `listChildren` | query | List child nodes of a parent |
| `createEntry` | internalMutation | Create knowledge entry under node |
| `listEntriesByNode` | query | List entries for selected node |
| `getTree` | query | Full tree for a client (flat list, build hierarchy client-side) |

## forum.ts

| Function | Type | Description |
|----------|------|-------------|
| `search` | internalQuery | Full-text search with sourceType/phase/fileType filters |
| `create` | internalMutation | Create forum entry (upvotes: 0) |
| `list` | query | Last 50 entries descending (admin/debug) |
| `publicSearch` | query | Same as search but callable from frontend |
| `update` | mutation | Update title/category/content/tags/upvotes |

## pipeline.ts

| Function | Type | Description |
|----------|------|-------------|
| `get` | internalQuery | Get pipeline status (agent use) |
| `getByClient` | query | Get pipeline status (frontend) |
| `update` | internalMutation | Upsert pipeline status |

## agentEvents.ts

| Function | Type | Description |
|----------|------|-------------|
| `emit` | internalMutation | Log an agent event |
| `listByClient` | query | Last 50 events descending |

## seed.ts

| Function | Type | Description |
|----------|------|-------------|
| `seedDemoData` | internalMutation | Populate demo: Acme Accounting, 3 sources, 6 tree nodes, 3 entries, 3 contradictions, 3-question questionnaire, 18 events, 2 forum entries |
