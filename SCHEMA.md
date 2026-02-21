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
  ├── knowledgeBaseNodes   (1 org has many KB nodes — nodes form a tree via parentId)
  │     ├── knowledgeBaseLinks   (directed edges between nodes — turns the tree into a RAG)
  │     └── nodeDataItems        (maps data items into KB nodes)
  │
  ├── verificationQuestions (1 org has many questions for human review)
  │
  └── agentJobs            (1 org has many jobs)
        ├── agentMessages  (1 job has many real-time log messages)
        └── performanceReports  (1 job produces 1 report, linked also to a forumGuide)

forumGuides               (shared across ALL orgs — the platform moat)
  └── performanceReports   (1 guide accumulates many reports from different jobs)
```

> **Privacy:** Every org-scoped table carries an `orgId`. All queries filter by `orgId` first, so data from one organisation is never accessible to another. The only exception is `forumGuides`, which is deliberately cross-org — it stores operational knowledge about *how* to process data, never the data itself.

---

## The Knowledge Base as a RAG

The KB is built in two layers that together form a **Retrieval-Augmented Generation** index:

1. **Tree layer** (`knowledgeBaseNodes` with `parentId`) — a hierarchy of folders, each with an AI-generated README. An agent navigating the KB reads READMEs progressively from root to leaf, narrowing in on the relevant section. This is the structured retrieval part.

2. **Graph layer** (`knowledgeBaseLinks`) — directed edges that connect nodes *across* the tree (e.g. "VAT Filings depends_on Invoices"). These cross-references turn the flat hierarchy into a true graph, enabling an agent to follow relationships between domains rather than being constrained to a single branch. This is what makes it a RAG rather than just a folder structure — retrieval can traverse the graph, not just descend the tree.

Together: **tree for navigation, graph for reasoning.**

---

## Redundant data — what was removed and why

Two fields were identified as redundant and removed:

| Field | Was on | Why redundant |
|-------|--------|---------------|
| `industry` | `organizations`, `performanceReports` | We are building for a single industry (accountancy). Storing it adds no information and would require keeping two copies in sync. |
| `jobType` | `performanceReports` | Already stored on the linked `agentJobs` document. Duplicating it means two sources of truth that could drift. To filter reports by job type, join through `jobId`. |

---

## Tables

### organizations

The accountancy firm being onboarded. Every other org-scoped table references back to this.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Firm name |
| description | string? | Optional longer description |
| phase | `"onboard"` \| `"explore"` \| `"structure"` \| `"verify"` \| `"ready"` | Current onboarding phase |
| goals | string[]? | What the firm wants to achieve with AI |
| createdBy | string? | Auth subject ID of the user who created this org |

**Phase values:**
- **onboard** — firm details entered, connecting data sources
- **explore** — agents are crawling and discovering data
- **structure** — agents are building the hierarchical knowledge base
- **verify** — human is reviewing and answering verification questions
- **ready** — knowledge base is verified and usable by AI agents

---

### dataSources

Each external system connected to an organisation (Google Drive, Gmail, etc.).

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

The hierarchical folder structure — the tree layer of the RAG. Each node has an optional parent, a depth level, and an AI-generated README that explains what's inside.

This is the core output of the **structure** phase.

| Field | Type | Description |
|-------|------|-------------|
| orgId | reference | Links to `organizations` |
| parentId | reference? | Links to another `knowledgeBaseNodes` — `null` means root level |
| name | string | Folder/section name |
| depth | number | 0 = root, 1 = first level down, etc. |
| orderIndex | number | Position among siblings (for display ordering) |
| readme | string? | AI-generated explanation: what's here, why it matters, how to use it |
| status | `"draft"` \| `"verified"` \| `"archived"` | Draft until a human verifies it |

**Example tree:**
```
0: Finance        (readme: "Overview of all financial data...")
  1: Invoices     (readme: "Client invoices organised by quarter...")
    2: Q1 2024
    2: Q2 2024
  1: VAT Filings  (readme: "All VAT returns and supporting docs...")
0: Clients
  1: Acme Ltd
  1: Brightfield Co
0: Compliance
  1: HMRC Correspondence
```

---

### knowledgeBaseLinks

The graph layer of the RAG. Directed edges that connect KB nodes across the tree, expressing relationships that don't fit into the parent-child hierarchy.

Without these links, the KB is just a folder tree. With them, an agent can follow typed relationships between domains — turning it into a navigable knowledge graph.

| Field | Type | Description |
|-------|------|-------------|
| orgId | reference | Links to `organizations` |
| sourceNodeId | reference | The node this edge comes from |
| targetNodeId | reference | The node this edge points to |
| relationship | `"depends_on"` \| `"related_to"` \| `"see_also"` \| `"parent_of"` | What kind of relationship |

**Example:** "VAT Filings" has a `depends_on` link to "Invoices" — an agent reasoning about VAT knows to also retrieve invoice data.

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
- **disambiguation** — "This column is labelled 'Ref'. Does it mean invoice reference, client code, or internal ID?"
- **conflict** — "Q3 revenue is £1.2M in one report and £1.4M in another. Which is correct?"
- **classification** — "We found 15 VAT filing documents. Should they live under Compliance, Finance, or both?"
- **missing_info** — "No contact details found for Brightfield Co. Can you provide them?"

---

### agentJobs

Tracks what AI agents are doing. Powers the real-time progress UI via Convex reactive queries.

| Field | Type | Description |
|-------|------|-------------|
| orgId | reference | Links to `organizations` |
| jobType | `"explore"` \| `"structure"` \| `"verify"` \| `"sync"` | What phase of work this job is doing |
| status | `"queued"` \| `"running"` \| `"completed"` \| `"failed"` | Current job state |
| progressPercent | number? | 0-100 progress indicator |
| startedAt | number? | Timestamp when the job started |
| completedAt | number? | Timestamp when the job finished |
| errorMessage | string? | Error details if the job failed |
| guideId | reference? | Links to `forumGuides` — which guide the agent followed |

---

### agentMessages

Live feed of agent activity. Each message is a single log entry the UI subscribes to in real-time.

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

Action guides written by agents and shared across **all organisations**. This is the platform's data moat — every engagement makes it smarter.

Not scoped to any org. When an agent discovers a better way to do something, it writes a guide here. Future agents consult these before starting work, picking the approach with the best performance record.

| Field | Type | Description |
|-------|------|-------------|
| title | string | e.g. "Parsing UK VAT returns from PDF" |
| category | `"connector"` \| `"cleaning"` \| `"structuring"` \| `"format"` \| `"other"` | What area this guide covers |
| content | string | The guide body in markdown |
| tags | string[] | Searchable tags, e.g. ["vat", "uk", "pdf"] |
| sourceContext | string? | What engagement or scenario produced this guide |
| usefulnessScore | number? | Manual upvote counter |

**Aggregated performance metrics** (auto-computed from performance reports every time a report is filed):

| Field | Type | Description |
|-------|------|-------------|
| totalUses | number? | How many times agents have used this guide |
| avgDurationMs | number? | Average job duration when following this guide |
| avgItemsProcessed | number? | Average number of items handled per job |
| avgErrorRate | number? | Average error rate (0-1) |
| avgQualityScore | number? | Average output quality (0-1) |
| successRate | number? | % of jobs that completed successfully (0-1) |
| lastUsedAt | number? | Timestamp of the most recent use |

---

### performanceReports

Filed by an agent after finishing a job. The feedback loop that makes guides compete on real results — the best approaches rise to the top.

Note: `jobType` is **not** stored here — it lives on the linked `agentJobs` document. Join through `jobId` to access it.

| Field | Type | Description |
|-------|------|-------------|
| guideId | reference | Links to `forumGuides` — which guide was followed |
| jobId | reference | Links to `agentJobs` — which job produced this report |
| orgId | reference | Links to `organizations` |
| outcome | `"success"` \| `"partial"` \| `"failure"` | How did it go |
| durationMs | number | How long the job took in milliseconds |
| itemsProcessed | number | How many data items were handled |
| itemsErrored | number | How many items hit errors |
| errorRate | number | Computed: itemsErrored / itemsProcessed (0-1) |
| qualityScore | number? | 0-1, agent's self-assessment of output quality |
| notes | string? | Free-text reflection on what worked or didn't |
| dataSourceProvider | string? | e.g. "google_drive" — enables per-provider comparison |

**The feedback loop:**
```
Agent picks best guide  →  Runs job  →  Files report  →  Guide metrics recomputed
        ↑                                                          │
        └────────── Next agent benefits from updated rankings ─────┘
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
| **Cross-org only** | `forumGuides`, `performanceReports` |
