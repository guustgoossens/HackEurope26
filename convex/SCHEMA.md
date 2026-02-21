# Database Schema

This document describes every table in the Convex backend, what it stores, how tables relate to each other, and which platform phase each one supports.

---

## How the tables connect

```
organizations
  │
  ├── dataSources          (1 org has many data sources)
  │     └── dataItems      (1 source has many discovered items)
  │
  ├── knowledgeBaseNodes   (1 org has many KB nodes, nodes form a tree)
  │     ├── knowledgeBaseLinks   (cross-references between nodes)
  │     └── nodeDataItems        (maps data items into KB nodes)
  │
  ├── verificationQuestions (1 org has many questions for human review)
  │
  ├── agentJobs            (1 org has many jobs)
  │     ├── agentMessages  (1 job has many real-time log messages)
  │     └── performanceReports  (1 job produces 1 report)
  │
  └── (agentJobs link to forumGuides via guideId)

forumGuides               (shared across ALL orgs — the platform moat)
  └── performanceReports   (1 guide has many reports from different jobs)
```

---

## Tables

### organizations

The company being onboarded. Every other org-scoped table references back to this.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Company name |
| industry | string | e.g. "accountancy", "legal", "consulting" |
| description | string? | Optional longer description |
| phase | `"onboard"` \| `"explore"` \| `"structure"` \| `"verify"` \| `"ready"` | Current onboarding phase |
| goals | string[]? | What the company wants to achieve with AI |
| createdBy | string? | Auth subject ID of the user who created this org |

**Phase values map directly to the platform flow:**
- **onboard** — company details entered, connecting data sources
- **explore** — AI agents are crawling and discovering data
- **structure** — AI is building the hierarchical knowledge base
- **verify** — human is reviewing and answering verification questions
- **ready** — knowledge base is verified and usable by AI agents

---

### dataSources

Each external system connected to an organization (Google Drive, Gmail, etc.).

| Field | Type | Description |
|-------|------|-------------|
| orgId | reference | Links to `organizations` |
| provider | `"google_drive"` \| `"gmail"` \| `"onedrive"` \| `"outlook"` \| `"sharepoint"` \| `"dropbox"` \| `"other"` | Which system this connects to |
| label | string | User-facing name, e.g. "Main Google Drive" |
| connectionStatus | `"pending"` \| `"connected"` \| `"error"` \| `"disconnected"` | Current connection state |
| lastSyncedAt | number? | Timestamp of last successful sync |
| config | string? | JSON-encoded connection config or token reference |
| errorMessage | string? | Error details if connection failed |

---

### dataItems

Individual files, emails, or documents discovered from a data source. Created during the **explore** phase as agents crawl through connected systems.

| Field | Type | Description |
|-------|------|-------------|
| orgId | reference | Links to `organizations` |
| dataSourceId | reference | Links to `dataSources` — which system this came from |
| name | string | File or document name |
| fileType | `"pdf"` \| `"spreadsheet"` \| `"document"` \| `"email"` \| `"image"` \| `"presentation"` \| `"other"` | What kind of data this is |
| path | string? | Original folder path or location in the source system |
| mimeType | string? | MIME type, e.g. "application/pdf" |
| sizeBytes | number? | File size |
| previewSnippet | string? | Short text preview extracted by the AI |
| externalId | string? | ID in the source system (for syncing) |
| externalUrl | string? | Direct link to the file in the source system |
| metadata | string? | JSON-encoded extra metadata |
| processingStatus | `"discovered"` \| `"processing"` \| `"processed"` \| `"error"` | How far along the AI is with this item |
| storageId | storage ref? | Convex file storage reference if the file was downloaded |

---

### knowledgeBaseNodes

The hierarchical folder structure that makes up the AI-navigable knowledge base. Nodes form a tree: each node has an optional parent, a depth level, and a README that explains what's inside.

This is the core output of the **structure** phase.

| Field | Type | Description |
|-------|------|-------------|
| orgId | reference | Links to `organizations` |
| parentId | reference? | Links to another `knowledgeBaseNodes` — `null` means root level |
| name | string | Folder/section name |
| depth | number | 0 = root, 1 = first level, etc. |
| orderIndex | number | Position among siblings (for display ordering) |
| readme | string? | AI-generated explanation of what's in this section, why it matters, how to use it |
| status | `"draft"` \| `"verified"` \| `"archived"` | Draft until a human verifies it |

**Example tree:**
```
0: Finance (readme: "Overview of all financial data...")
  1: Invoices (readme: "Client invoices organized by quarter...")
    2: Q1 2024
    2: Q2 2024
  1: VAT Filings (readme: "All VAT returns and supporting docs...")
0: Clients (readme: "Client records and correspondence...")
  1: Client A
  1: Client B
```

---

### knowledgeBaseLinks

Cross-references between KB nodes. These capture relationships that don't fit into the parent-child tree structure.

| Field | Type | Description |
|-------|------|-------------|
| orgId | reference | Links to `organizations` |
| sourceNodeId | reference | The node this link comes from |
| targetNodeId | reference | The node this link points to |
| relationship | `"depends_on"` \| `"related_to"` \| `"see_also"` \| `"parent_of"` | What kind of relationship |

**Indexes:**
- `by_orgId` - Query all links for an organization (used by knowledge graph visualization)
- `by_sourceNodeId` - Find outgoing links from a node
- `by_targetNodeId` - Find incoming links to a node

**Example:** The "VAT Filings" node might have a `depends_on` link to "Invoices" because VAT filings reference invoice data.

**Used in:** Knowledge graph visualization (`convex/knowledgeGraph.ts`) to show relationships between nodes in the interactive force-directed graph.

---

### nodeDataItems

Junction table that maps data items into KB nodes. A single data item can appear in multiple nodes (e.g. a document relevant to both "Finance" and "Compliance").

| Field | Type | Description |
|-------|------|-------------|
| nodeId | reference | Links to `knowledgeBaseNodes` |
| dataItemId | reference | Links to `dataItems` |
| relevanceScore | number? | 0-1, AI-assigned confidence that this item belongs in this node |

---

### verificationQuestions

Ambiguities and contradictions the AI surfaces during the **verify** phase. Presented to the human as a structured questionnaire.

| Field | Type | Description |
|-------|------|-------------|
| orgId | reference | Links to `organizations` |
| relatedNodeId | reference? | Which KB node this question is about |
| relatedDataItemIds | reference[]? | Which data items are involved |
| questionText | string | The question itself |
| questionType | `"disambiguation"` \| `"conflict"` \| `"classification"` \| `"missing_info"` | What kind of problem the AI found |
| options | array of `{ label, description? }` | Multiple-choice answers |
| status | `"pending"` \| `"answered"` \| `"skipped"` | Has the human dealt with this yet |
| answer | string? | The human's chosen answer |
| aiConfidence | number? | 0-1, how confident the AI was before asking |

**Question type examples:**
- **disambiguation** — "This column is labeled 'Ref'. Does it mean invoice reference, client code, or internal ID?"
- **conflict** — "Q3 revenue is EUR 1.2M in one report and EUR 1.4M in another. Which is correct?"
- **classification** — "We found 15 VAT filing documents. Should they live under Compliance, Finance, or both?"
- **missing_info** — "No client contact details found for Client B. Can you provide them?"

---

### agentJobs

Tracks what AI agents are doing. Powers the real-time progress UI so users can watch agents work.

| Field | Type | Description |
|-------|------|-------------|
| orgId | reference | Links to `organizations` |
| jobType | `"explore"` \| `"structure"` \| `"verify"` \| `"sync"` | What phase of work this job is doing |
| status | `"queued"` \| `"running"` \| `"completed"` \| `"failed"` | Current job state |
| progressPercent | number? | 0-100 progress indicator |
| startedAt | number? | Timestamp when the job started running |
| completedAt | number? | Timestamp when the job finished |
| errorMessage | string? | Error details if the job failed |
| guideId | reference? | Links to `forumGuides` — which guide the agent followed for this job |

---

### agentMessages

Live feed of agent activity. Each message is a single log entry the UI subscribes to in real-time via Convex reactive queries.

| Field | Type | Description |
|-------|------|-------------|
| orgId | reference | Links to `organizations` |
| jobId | reference | Links to `agentJobs` |
| messageType | `"info"` \| `"warning"` \| `"discovery"` \| `"question"` \| `"error"` | What kind of event this is |
| content | string | Human-readable description of what happened |
| relatedNodeId | reference? | Links to a KB node if relevant |
| relatedDataItemId | reference? | Links to a data item if relevant |

**Example messages:**
- `info` — "Scanning Google Drive folder /Finance/2024..."
- `discovery` — "Found 47 PDF invoices in /Finance/Invoices/"
- `warning` — "3 files could not be read (password protected)"
- `error` — "Google Drive API rate limit hit, retrying in 30s"

---

### forumGuides

Action guides written by agents and shared across ALL organizations. This is the platform's data moat — every engagement makes it smarter.

Not scoped to a single org. When an agent figures out a better way to do something, it writes a guide here for all future agents to use.

| Field | Type | Description |
|-------|------|-------------|
| title | string | Guide title, e.g. "Parsing UK VAT returns from PDF" |
| category | `"connector"` \| `"cleaning"` \| `"structuring"` \| `"format"` \| `"other"` | What area this guide covers |
| content | string | The guide body in markdown |
| tags | string[] | Searchable tags, e.g. ["vat", "uk", "pdf", "accountancy"] |
| sourceContext | string? | What engagement or scenario produced this guide |
| usefulnessScore | number? | Manual upvote counter (separate from performance metrics) |

**Aggregated performance metrics** (auto-computed from performance reports):

| Field | Type | Description |
|-------|------|-------------|
| totalUses | number? | How many times agents have used this guide |
| avgDurationMs | number? | Average job duration when following this guide |
| avgItemsProcessed | number? | Average number of items handled per job |
| avgErrorRate | number? | Average error rate across all jobs (0-1) |
| avgQualityScore | number? | Average output quality across all jobs (0-1) |
| successRate | number? | Percentage of jobs that completed successfully (0-1) |
| lastUsedAt | number? | Timestamp of the most recent job that used this guide |

These metrics update automatically every time an agent files a performance report. Agents use them to pick the best guide before starting work.

---

### performanceReports

Filed by an agent after finishing a job. This is the feedback loop that makes guides compete on results — the best approaches rise to the top.

| Field | Type | Description |
|-------|------|-------------|
| guideId | reference | Links to `forumGuides` — which guide was followed |
| jobId | reference | Links to `agentJobs` — which job produced this report |
| orgId | reference | Links to `organizations` |
| jobType | `"explore"` \| `"structure"` \| `"verify"` \| `"sync"` | What kind of work was done |
| outcome | `"success"` \| `"partial"` \| `"failure"` | How did it go |
| durationMs | number | How long the job took in milliseconds |
| itemsProcessed | number | How many data items were handled |
| itemsErrored | number | How many items hit errors |
| errorRate | number | Computed: itemsErrored / itemsProcessed (0-1) |
| qualityScore | number? | 0-1, agent's self-assessment of output quality |
| notes | string? | Free-text reflection on what worked or didn't |
| dataSourceProvider | string? | e.g. "google_drive" — enables per-provider comparison |
| industry | string? | e.g. "accountancy" — enables per-industry comparison |

**The feedback loop:**
```
Agent picks best guide  ──>  Runs job  ──>  Files report  ──>  Guide metrics update
      ^                                                              │
      └──────────────── Next agent benefits from updated rankings ───┘
```

---

## Which tables serve which phase

| Phase | Tables used |
|-------|-------------|
| **Onboard** | `organizations`, `dataSources` |
| **Explore** | `dataItems`, `agentJobs`, `agentMessages`, `forumGuides` |
| **Structure** | `knowledgeBaseNodes`, `knowledgeBaseLinks`, `nodeDataItems`, `agentJobs`, `agentMessages`, `forumGuides` |
| **Verify** | `verificationQuestions`, `knowledgeBaseNodes` |
| **Ready / Use** | All tables (read), `performanceReports` (write) |
| **Cross-org** | `forumGuides`, `performanceReports` |

---

## Knowledge Graph Visualization

The **Structure** phase features an interactive, real-time force-directed graph visualization built with `react-force-graph-2d`.

### Backend Queries (`convex/knowledgeGraph.ts`)

**`getKnowledgeGraph(orgId)`**
- Returns all `knowledgeBaseNodes` and `knowledgeBaseLinks` for an organization
- Transforms data into react-force-graph format:
  - Nodes: `{ id, name, depth, status, readme, parentId, orderIndex }`
  - Links: `{ source, target, relationship }`
- Uses indexes: `by_orgId` on both tables for efficient querying

**`getNodeDetails(nodeId)`**
- Returns detailed information about a specific node
- Includes:
  - Node data (name, readme, status, depth)
  - Associated data items via `nodeDataItems` junction table
  - Outgoing links via `by_sourceNodeId` index
  - Incoming links via `by_targetNodeId` index

### Frontend Components (`src/components/`)

**`KnowledgeGraphView.tsx`**
- Main graph visualization component
- Features:
  - Color-coded nodes by status (verified=green, draft=orange, archived=gray)
  - Color-coded links by relationship type
  - Node size based on depth (root nodes are larger)
  - Hover effects to highlight connected nodes
  - Click to select nodes
  - Auto-zoom to fit on load
  - Real-time updates via Convex reactive queries

**`GraphNodeDetail.tsx`**
- Side panel showing node details
- Displays: status, depth, README, data items, links

### Real-time Updates

The graph automatically updates when:
- Agents create new nodes during Structure phase (draft nodes appear)
- Humans verify nodes during Verify phase (nodes turn green)
- Links are created or modified

New draft nodes are highlighted with a glow effect to draw attention.

### Demo Data

Use `convex/seed.ts` → `seedAccountingFirmKB(orgId)` to populate demo data:
- Creates 9 nodes (Finance, Clients, Compliance + children)
- Creates 11 links showing various relationship types
- Perfect for demonstrating the graph in Phase 3

See `QUICKSTART.md` and `KNOWLEDGE_GRAPH_IMPLEMENTATION.md` for setup instructions.
