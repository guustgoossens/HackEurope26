# HTTP API

11 endpoints in `convex/http.ts`. All authenticated via `Authorization: Bearer AGENT_AUTH_TOKEN`.

Base URL: `CONVEX_SITE_URL` (set in agent `.env`)

---

## POST Endpoints (Write Operations)

| Path | Convex Function | Body |
|------|-----------------|------|
| `/api/agent/event` | `internal.agentEvents.emit` | `{clientId, agentName, eventType, message, metadata?}` |
| `/api/agent/contradiction` | `internal.contradictions.add` | `{clientId, description, sourceA, sourceB, valueA, valueB}` |
| `/api/agent/exploration` | `internal.explorations.upsert` | `{clientId, dataSourceId, metrics, status}` |
| `/api/agent/knowledge/node` | `internal.knowledge.createNode` | `{clientId, parentId?, name, type, readme?, order}` |
| `/api/agent/knowledge/entry` | `internal.knowledge.createEntry` | `{clientId, treeNodeId, title, content, sourceRef?, confidence, verified?}` |
| `/api/agent/forum/create` | `internal.forum.create` | `{title, category, content, authorAgent, tags, sourceType?, phase?, fileType?}` |
| `/api/agent/forum/search` | `internal.forum.search` | `{query, sourceType?, phase?, fileType?}` |
| `/api/agent/questionnaire/create` | `internal.questionnaires.create` | `{clientId, title, questions[]}` |
| `/api/agent/pipeline/update` | `internal.pipeline.update` | `{clientId, currentPhase, phaseProgress, activeAgents}` |

## GET Endpoints (Read Operations)

| Path | Convex Function | Query Params |
|------|-----------------|--------------|
| `/api/agent/data-sources` | `internal.dataSources.internalListByClient` | `?clientId=` |
| `/api/agent/questionnaire/responses` | `internal.questionnaires.internalGetResponses` | `?questionnaireId=` |
| `/api/agent/pipeline` | `internal.pipeline.get` | `?clientId=` |

---

## Event Types

`eventType` in `/api/agent/event`:
- `info` — general activity log
- `progress` — metrics or progress update
- `warning` — non-fatal issue
- `error` — tool failure or agent error
- `complete` — phase or agent completion

---

## Error Handling

All endpoints wrap handlers in `try/catch`. On error:
```json
{"error": "message string"}
```
HTTP 500.

On success:
```json
{"success": true, ...data}
```
HTTP 200.

A `stripNulls()` helper removes null/empty-string fields from Convex responses before serializing to JSON (added `http.ts` Feb 2026).

---

## Auth

The bearer token (`AGENT_AUTH_TOKEN` in Convex dashboard, `CONVEX_AGENT_TOKEN` in agent `.env`) is the same secret. The frontend never calls these endpoints — they're agents-only. Internal Convex mutations behind the endpoints aren't exposed to public queries.
