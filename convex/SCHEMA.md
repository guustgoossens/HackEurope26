# Database Schema

This document describes every table in the Convex backend, what it stores, how tables relate to each other, and which platform phase each one supports.

> **Source of truth:** `convex/schema.ts`. This doc is kept in sync manually — if in doubt, read the schema file directly.

---

## How the tables connect

```
clients
  │
  ├── data_sources          (1 client has many connected data sources)
  │     └── explorations    (1 source has many exploration runs)
  │
  ├── knowledge_tree        (1 client has many tree nodes, nodes form a hierarchy)
  │     └── knowledge_entries  (1 node has many extracted knowledge entries)
  │
  ├── contradictions        (1 client has many detected conflicts)
  │     └── questionnaires  (groups contradictions into human review sessions)
  │           └── questionnaire_responses  (human answers to each question)
  │
  ├── pipeline_status       (1 client has 1 current pipeline state)
  └── agent_events          (1 client has many agent log events)

forum_entries               (shared across ALL clients — platform knowledge moat)
```

---

## Tables

### clients

The company being onboarded. Every other client-scoped table references back to this.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Company name, e.g. "Cabinet Dupont & Associés" |
| industry | string | e.g. "Accountancy", "Legal", "Consulting" |
| phase | `"onboard"` \| `"explore"` \| `"structure"` \| `"verify"` \| `"use"` | Current onboarding phase |
| createdBy | string | WorkOS user ID of the account manager who created this client |

**Indexes:** `by_createdBy` — list all clients for a given user

**Phase values map to the five-stage platform flow:**
- **onboard** — company details entered, data sources being connected
- **explore** — AI agents are crawling and discovering files
- **structure** — AI is building the hierarchical knowledge tree
- **verify** — human is reviewing contradictions and approving the KB
- **use** — knowledge base is ready; AI agents can query it

---

### data_sources

Each external system connected to a client (Google Drive, Gmail, Sheets).

| Field | Type | Description |
|-------|------|-------------|
| clientId | reference | Links to `clients` |
| type | `"gmail"` \| `"drive"` \| `"sheets"` | Which system |
| label | string | User-facing name, e.g. "Dupont Main Drive" |
| connectionStatus | `"pending"` \| `"connected"` \| `"error"` | Current connection state |
| composioEntityId | string? | Composio integration entity ID (if using Composio connector) |

**Indexes:** `by_clientId`

---

### explorations

Tracks one agent run per data source. Records how many files were found, processed, and errored.

| Field | Type | Description |
|-------|------|-------------|
| clientId | reference | Links to `clients` |
| dataSourceId | reference | Links to `data_sources` — which source was explored |
| metrics | any | `{ filesFound, filesProcessed, errored }` — progress numbers |
| status | `"running"` \| `"completed"` \| `"failed"` | Current run state |

**Indexes:** `by_clientId`, `by_clientId_and_dataSourceId`

**Used in:** Exploration graph visualization (`api.visualizationGraph.getExplorationGraph`) — shows which sources have been explored and their status.

---

### knowledge_tree

The hierarchical knowledge structure — the core output of the **structure** phase. Nodes form a tree via `parentId`. There are three node types:

| Type | Meaning | Example |
|------|---------|---------|
| `domain` | Top-level knowledge area or folder | "Finance", "Clients", "Compliance" |
| `skill` | A sub-area or sub-folder under a domain | "VAT Filings", "Acme Ltd", "HMRC" |
| `entry_group` | A file, document group, or leaf node | "vat_return_Q2_2024.pdf", "2024 Invoices" |

| Field | Type | Description |
|-------|------|-------------|
| clientId | reference | Links to `clients` |
| parentId | reference? | Links to another `knowledge_tree` node — `null` means root |
| name | string | Node name — can be a folder name or a real filename |
| type | `"domain"` \| `"skill"` \| `"entry_group"` | Node type (see table above) |
| readme | string? | AI-generated description of what's in this node and why it matters |
| order | number | Display order among siblings |

**Indexes:** `by_clientId`, `by_clientId_and_parentId`

**Example tree (messy state):**
```
🏛️ Finance (domain, root)
  ⚡ VAT (skill)
    📚 vat_return_Q2_2024_draft.pdf  (entry_group) ← ⚠️ conflicts with amended version
  ⚡ Invoices (skill)
🏛️ Finance (Old) (domain, root)    ← duplicate top-level folder!
  ⚡ VAT Returns (skill)
    📚 vat_Q2_2024_AMENDED.pdf      (entry_group) ← ⚠️ in the WRONG folder
🏛️ Misc (domain, root)
  📚 invoice_acme_march.pdf         (entry_group) ← invoice buried in Misc
  📚 HMRC_response_draft.docx       (entry_group) ← compliance doc in Misc
```

**Graph visualization:** `api.visualizationGraph.getKnowledgeTree` returns nodes + edges:
- Blue edges (`parent_of`) — from parentId hierarchy
- Green edges (`relates_to`) — where the same file (`sourceRef`) is referenced from multiple nodes

---

### knowledge_entries

Extracted facts and summaries attached to a `knowledge_tree` node. Each entry represents something the agent learned from one or more source files.

| Field | Type | Description |
|-------|------|-------------|
| clientId | reference | Links to `clients` |
| treeNodeId | reference | Links to `knowledge_tree` — which node this entry belongs to |
| title | string | Short title for the entry, e.g. "Q2 VAT Liability" |
| content | string | The extracted knowledge, in plain English |
| sourceRef | string? | Filename or source reference this was extracted from — **used to draw cross-links in the knowledge graph** |
| confidence | number | 0–1, AI confidence in this entry |
| verified | boolean | `true` once a human has confirmed it |

**Indexes:** `by_clientId`, `by_treeNodeId`

**Key behaviour:** When two entries on different nodes share the same `sourceRef`, `getKnowledgeTree` draws a green `relates_to` edge between those nodes in the graph. This surfaces files that are cross-referenced across the tree (e.g. a P&L doc referenced from both Finance and HMRC Correspondence).

---

### contradictions

Conflicts the agent found between source files — the same value appearing differently in two places. These become the human review items.

| Field | Type | Description |
|-------|------|-------------|
| clientId | reference | Links to `clients` |
| description | string | Human-readable description of the conflict |
| sourceA | string | Filename of the first source |
| sourceB | string | Filename of the second source |
| valueA | string | What sourceA says |
| valueB | string | What sourceB says (contradicts valueA) |
| status | `"open"` \| `"resolved"` \| `"dismissed"` | Has this been dealt with |
| resolution | string? | How it was resolved (if status = resolved) |

**Indexes:** `by_clientId`, `by_clientId_and_status`

**Graph visualization:** `api.visualizationGraph.getContradictionsGraph` — each unique source file becomes a node; each contradiction becomes a red `contradicts` edge between two file nodes.

**Example contradictions in the demo:**
- `vat_return_Q2_2024_draft.pdf` (£84,200) vs `vat_Q2_2024_AMENDED.pdf` (£91,500)
- `cashflow_forecast_v1.xlsx` (Jan) vs `cashflow_forecast_v3_FINAL.xlsx` (Mar)
- `payroll_march_2024.xlsx` (in Expenses folder) vs `expenses_march_2024.pdf` (in Payroll folder)

---

### questionnaires

Groups contradictions and ambiguities into a structured questionnaire presented to a human during the **verify** phase.

| Field | Type | Description |
|-------|------|-------------|
| clientId | reference | Links to `clients` |
| title | string | Questionnaire title, e.g. "Data Conflicts — Review Required" |
| questions | array | List of `{ id, text, options[], contradictionId? }` |
| status | `"draft"` \| `"sent"` \| `"completed"` | Has this been sent to / completed by the human |

**Indexes:** `by_clientId`

---

### questionnaire_responses

Human answers to individual questionnaire questions.

| Field | Type | Description |
|-------|------|-------------|
| questionnaireId | reference | Links to `questionnaires` |
| questionId | string | ID of the specific question within the questionnaire |
| selectedOption | string | The answer the human chose |
| respondedBy | string | WorkOS user ID of the person who answered |

**Indexes:** `by_questionnaireId`, `by_questionnaireId_and_questionId`

---

### pipeline_status

Tracks the current state of the AI pipeline for a client. One row per client.

| Field | Type | Description |
|-------|------|-------------|
| clientId | reference | Links to `clients` |
| currentPhase | `"explore"` \| `"structure"` \| `"verify"` \| `"use"` | Active pipeline phase |
| phaseProgress | number | 0–100 progress within the current phase |
| activeAgents | string[] | Names of agents currently running, e.g. `["explorer-agent-1"]` |
| lastActivity | number | Timestamp of last agent activity |

**Indexes:** `by_clientId`

---

### agent_events

Real-time log feed of agent activity. Each row is one event. The UI subscribes reactively to see the live feed.

| Field | Type | Description |
|-------|------|-------------|
| clientId | reference | Links to `clients` |
| agentName | string | Which agent fired this event, e.g. "explorer-agent-1" |
| eventType | `"info"` \| `"progress"` \| `"warning"` \| `"error"` \| `"complete"` | Severity/type |
| message | string | Human-readable description of what happened |
| metadata | any? | Optional JSON blob with extra structured data |

**Indexes:** `by_clientId`

**Example events:**
- `info` — "Connected to Google Drive. Scanning 8 top-level folders..."
- `progress` — "Found 84 files across 21 folders. Beginning classification."
- `warning` — "vat_Q2_2024_AMENDED.pdf is in Finance (Old) — probably belongs in VAT. Flagged."
- `error` — "CONFLICT: Q2 VAT liability reported as £84,200 in draft vs £91,500 in amended. Human review needed."
- `complete` — "Structure complete. 46 nodes → 12. 7 contradictions flagged."

---

### forum_entries

Agent-written knowledge guides shared across ALL clients. This is the platform's data moat — every engagement makes the platform smarter for future clients.

Not scoped to a single client.

| Field | Type | Description |
|-------|------|-------------|
| title | string | Guide title, e.g. "Parsing UK VAT returns from PDF" |
| category | string | Topic area, e.g. "vat", "payroll", "hmrc" |
| content | string | Guide body in markdown |
| authorAgent | string | Agent that wrote this guide |
| tags | string[] | Searchable tags, e.g. `["vat", "uk", "pdf", "accountancy"]` |
| upvotes | number | Usefulness votes from other agents |

**Indexes:** `by_category`
**Search index:** `search_content` — full-text search on the `content` field

---

## Which tables serve which phase

| Phase | Tables read | Tables written |
|-------|-------------|----------------|
| **Onboard** | — | `clients`, `data_sources` |
| **Explore** | `data_sources` | `explorations`, `agent_events`, `pipeline_status` |
| **Structure** | `explorations` | `knowledge_tree`, `knowledge_entries`, `contradictions`, `agent_events`, `pipeline_status` |
| **Verify** | `contradictions`, `knowledge_tree` | `questionnaires`, `questionnaire_responses`, `contradictions` (status updates) |
| **Use** | All tables | — |
| **Cross-client** | `forum_entries` | `forum_entries` (agents write new guides) |

---

## Graph Visualizations

Three views are available in `ClientDetail`, each behind a toggle button:

### Knowledge Tree (`api.visualizationGraph.getKnowledgeTree`)
- **Phase:** Structure
- **Nodes:** All `knowledge_tree` rows for the client
  - 🏛️ `domain` — top-level folder/area
  - ⚡ `skill` — sub-folder/sub-area
  - 📚 `entry_group` — file or document group
- **Edges:**
  - 🔵 Blue `parent_of` — from the `parentId` hierarchy
  - 🟢 Green `relates_to` — where two nodes share the same `sourceRef` in their `knowledge_entries` (same file referenced from two parts of the tree)
- **Messy state:** 46 flat/misplaced nodes with cross-links showing files in the wrong folders
- **Clean state:** 12 well-structured nodes in a 3-level hierarchy

### Exploration Graph (`api.visualizationGraph.getExplorationGraph`)
- **Phase:** Explore
- **Nodes:** All `data_sources` for the client (📧 Gmail, 📁 Drive, 📊 Sheets)
- **Edges:** Purple `explored` edge for completed explorations
- **Node colour:** Green = connected, Red = error, Gray = pending

### Contradictions Graph (`api.visualizationGraph.getContradictionsGraph`)
- **Phase:** Verify
- **Nodes:** Each unique file (`sourceA` / `sourceB`) from open `contradictions`
- **Edges:** 🔴 Red `contradicts` — one edge per contradiction pair
- **Demo:** 7 open contradictions → a dense red collision web of conflicting files

---

## Demo Data

Use `convex/demoData.ts` to seed Cabinet Dupont & Associés (fictional accountancy firm):

```bash
# Create the client
npx convex run demoData:createDemoClient

# Seed messy state (46 nodes, 7 contradictions, files in wrong folders)
npx convex run demoData:insertDemoMessy '{"clientId":"<id>"}'

# Switch to clean state (12 nodes, contradictions resolved)
npx convex run demoData:clearDemo '{"clientId":"<id>"}'
npx convex run demoData:insertDemoClean '{"clientId":"<id>"}'

# Make demo clients visible to your user account
npx convex run demoData:reownDemo '{"createdBy":"<your-workos-user-id>"}'
```
