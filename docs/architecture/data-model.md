# Data Model

11 Convex tables. Schema: `convex/schema.ts`.

---

## Table Hierarchy

```
clients
  │ phase: onboard | explore | structure | verify | use
  │ index: by_createdBy
  │
  ├── data_sources
  │     type: gmail | drive | sheets
  │     connectionStatus: pending | connected | error
  │     composioEntityId: optional — Composio per-source auth ID
  │     index: by_clientId
  │
  ├── explorations
  │     metrics (per data source — any shape)
  │     status: running | completed | failed
  │     indexes: by_clientId, by_clientId_and_dataSourceId
  │
  ├── contradictions
  │     sourceA vs sourceB, valueA vs valueB
  │     status: open | resolved | dismissed
  │     indexes: by_clientId, by_clientId_and_status
  │
  ├── questionnaires
  │     questions[] with options + optional contradictionId link
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
  │     readme: optional navigation hint
  │     indexes: by_clientId, by_clientId_and_parentId
  │     │
  │     └── knowledge_entries
  │           confidence (0–1), verified (bool), sourceRef?
  │           indexes: by_clientId, by_treeNodeId
  │
  ├── pipeline_status
  │     currentPhase, phaseProgress (%), activeAgents[]
  │     index: by_clientId
  │
  └── agent_events
        agentName, eventType, message, metadata?
        eventType: info | progress | warning | error | complete
        index: by_clientId

forum_entries  (global — not per-client, shared across all engagements)
  title, category, content, authorAgent, tags[], upvotes
  sourceType?, phase?, fileType?  ← metadata filter fields (added Feb 2026)
  index: by_category
  searchIndex: search_content (full-text, filterFields: sourceType, phase, fileType, category)
```

---

## Field Reference

### clients
| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Client name |
| `industry` | string | Industry (e.g. "Accounting") |
| `phase` | union | Current pipeline phase |
| `createdBy` | string | WorkOS user ID |

### data_sources
| Field | Type | Notes |
|-------|------|-------|
| `clientId` | id(clients) | |
| `type` | union | gmail \| drive \| sheets |
| `label` | string | Human-readable name |
| `connectionStatus` | union | pending \| connected \| error |
| `composioEntityId` | string? | Composio auth entity ID |

### knowledge_tree
| Field | Type | Notes |
|-------|------|-------|
| `clientId` | id(clients) | |
| `parentId` | id(knowledge_tree)? | Null for root domains |
| `name` | string | Node label |
| `type` | union | domain \| skill \| entry_group |
| `readme` | string? | Navigation hint for agents |
| `order` | number | Display order among siblings |

### forum_entries
| Field | Type | Notes |
|-------|------|-------|
| `title` | string | Guide title |
| `category` | string | e.g. "gmail", "drive", "general" |
| `content` | string | Full guide content (full-text searchable) |
| `authorAgent` | string | "explorer" \| "structurer" |
| `tags` | string[] | |
| `upvotes` | number | |
| `sourceType` | string? | Filter: gmail \| drive \| sheets |
| `phase` | string? | Filter: explore \| structure \| verify \| use |
| `fileType` | string? | Filter: spreadsheet \| pdf \| email \| document |
