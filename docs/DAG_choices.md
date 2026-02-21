# Knowledge Base Architecture — DAG, Accounting Specificities & Convex Implementation

## 1. Why Not a Pure Tree

A tree (strict hierarchy) forces every node to have exactly one parent. This breaks down immediately in accounting contexts where a single document belongs to multiple domains simultaneously.

A supplier invoice is at once:
- A financial document (Finance/Invoices/)
- A VAT justification (Compliance/TVA/)
- A client record (Clients/Martin_SARL/)
- Part of an annual closing file (Periods/2024/Q3/)

Forcing it into one branch loses all other relationships. An agent navigating a pure tree will miss cross-domain context, producing incomplete or hallucinated answers.

**Decision: use a Directed Acyclic Graph (DAG)** — a hierarchical backbone (the tree) enriched with explicit cross-domain edges (the pointers). This is exactly the Obsidian model: files live in folders, but links between files create a graph layer on top.

---

## 2. Core Vocabulary

| English | French | Definition |
|---|---|---|
| Node | Nœud | A document, folder, entity, or rule in the KB |
| Edge | Arête / Lien | A directed connection between two nodes |
| Directed edge | Lien orienté | A → B, not necessarily B → A |
| Backlink | Rétrolien | B knows that A points to it |
| Pointer | Pointeur | A reference from one node to another |
| Leaf node | Nœud feuille | No children — end of a branch |
| Collapsed node | Nœud fermé / replié | Connections hidden in the graph view |
| Expanded node | Nœud ouvert / déplié | Children and links visible |
| Cluster | Grappe | Group of densely connected nodes |
| Hub node | Nœud hub | Node with many connections, highly central |
| Orphan node | Nœud orphelin | No incoming or outgoing links |
| DAG | Graphe orienté acyclique | Directed graph with no cycles |
| Transclusion | Transclusion | Including node content elsewhere without duplicating |
| Entity resolution | Résolution d'entités | Identifying that two records refer to the same real-world thing |

---

## 3. French Accounting Specificities That Drive the Architecture

### 3.1 The FEC (Fichier des Écritures Comptables)

Mandatory normalized CSV with 18 columns. Structured but not semantic:
- `CompteNum` = 411000 means "client account" — but which client?
- `PieceRef` = "FAC2024-089" points to a physical invoice in another system
- `EcritureLib` = "RGt Martin" is free text written differently by every cabinet

The FEC is the central relational document of French accounting. Every row is a node. Every reference in that row is a potential edge to resolve.

### 3.2 The Plan Comptable Général (PCG)

A normalized account hierarchy mandated by French law. Classes 1-7 cover all accounting domains. This hierarchy is a **free blueprint** for your KB structure — already understood by every French accountant, no need to invent it.

The KB aligns with PCG at the metadata level (every node has a `compteNum` field) while presenting domain-based navigation at the surface level (Finance, Compliance, Clients, Operations) — what accountants actually think in.

### 3.3 Mandatory Accounting Cycles — The Temporal Dimension

- **Monthly:** VAT declarations (CA3), bank reconciliations
- **Quarterly:** corporate tax installments, quarterly VAT (CA12)
- **Annual:** closing, liasse fiscale (2065/2031), bilan, compte de résultat, annexes

Each cycle produces documents that reference previous cycles. A 2024 bilan references the 2023 bilan (report à nouveau). A Q3 TVA declaration reconciles with Q1 and Q2.

Time is a first-class navigation dimension. Nodes have a `periode` field. `temporal_next` edges connect sequential periods of the same document type.

### 3.4 Two-Level KB Structure (Cabinet vs Clients)

```
Cabinet_KB/               ← the firm's own operational knowledge
  └── Rules/              (fiscal rules, procedures, templates)
  └── Procedures/
  └── Templates/

Clients_KB/               ← per-client knowledge
  └── Martin_SARL/
  └── Dupont_SAS/
```

Cross-edges link cabinet rules to the specific clients they apply to. A rule applied differently for one client gets an edge to that client's node with a `requires` or `references` type.

### 3.5 The Four Hard Data Problems

**Inconsistent naming:** Five files named differently that are the same document (or aren't). Requires embedding similarity + metadata comparison + human verification when confidence is below threshold.

**Implicit cross-references:** "Following our Tuesday conversation regarding the usual file" — no explicit reference. Agent must infer from temporal context, sender identity, and ongoing document threads, or flag for human resolution.

**Quantitative contradictions:** Same KPI, two different amounts. Legitimate in accounting (HT vs TTC, provisional vs audited, EUR vs FX converted). Not an error — a definitional difference. Modeled as a `contradicts` edge, colored orange in the graph, surfaced as a verification question.

**Non-text formats:** Scanned PDFs, Excel files with hidden formulas, legacy CSV exports with Windows-1252 encoding. Handled by Gemini (multimodal) in the extraction layer before the KB is built.

---

## 4. The DAG Data Model

### Node Types

```typescript
type NodeType =
  | "folder"      // hierarchical container
  | "document"    // source document
  | "entity"      // business entity (client, supplier)
  | "rule"        // business or fiscal rule
  | "period"      // accounting period
  | "readme"      // README for a folder level
```

### Edge Types

```typescript
type EdgeType =
  | "parent_of"       // hierarchical link (tree backbone)
  | "references"      // A cites or points to B
  | "contradicts"     // A contradicts B — needs human resolution
  | "supersedes"      // A replaces B (newer version)
  | "requires"        // A is incomplete without B
  | "same_entity"     // A and B refer to the same real-world thing
  | "temporal_next"   // B is the next period of A
```

### Collapsed/Expanded Node Logic

- Depth ≥ 3 → collapsed by default in graph view
- Click to expand → children appear with spring animation
- Cross-domain edges (references, contradicts, requires) always visible regardless of collapse state — these are the visually interesting connections
- `contradicts` edges render in orange
- `same_entity` edges render in yellow (potential duplicate)
- `parent_of` edges render in muted grey

---

## 5. Convex Implementation

### Why Convex Over Supabase for This Use Case

The central demo moment is the graph building in real time as agents write nodes. Every agent write must immediately appear in the browser without any polling or manual websocket management.

Convex is reactive by design. When an agent writes a node, every client subscribed to `getNodes` updates automatically. This behavior is the default — not a feature to configure.

With Supabase Realtime, the same effect requires explicit channel subscriptions, manual state reconciliation, and careful handling of race conditions when the agent writes multiple nodes in rapid succession. Convex handles this transactionally.

### Full Convex Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({

  nodes: defineTable({
    // Identity
    label: v.string(),
    type: v.union(
      v.literal("folder"),
      v.literal("document"),
      v.literal("entity"),
      v.literal("rule"),
      v.literal("period"),
      v.literal("readme")
    ),

    // Content
    content: v.string(),
    embedding: v.optional(v.array(v.float64())),

    // Hierarchy
    parentId: v.optional(v.id("nodes")),
    path: v.string(),         // "/Finance/Factures/Martin_SARL"
    depth: v.number(),        // 0 = root

    // Source
    sourceType: v.string(),   // "gmail" | "drive" | "pennylane" | "excel"
    sourceId: v.string(),
    sourceUrl: v.optional(v.string()),

    // Verification state
    verified: v.boolean(),
    verificationStatus: v.union(
      v.literal("auto"),      // resolved by agent
      v.literal("pending"),   // awaiting human
      v.literal("human")      // human verified
    ),

    // Accounting metadata
    compteNum: v.optional(v.string()),    // PCG account number
    periode: v.optional(v.string()),      // "2024-Q3"
    clientId: v.optional(v.id("nodes")),
  }),

  edges: defineTable({
    sourceId: v.id("nodes"),
    targetId: v.id("nodes"),
    edgeType: v.union(
      v.literal("parent_of"),
      v.literal("references"),
      v.literal("contradicts"),
      v.literal("supersedes"),
      v.literal("requires"),
      v.literal("same_entity"),
      v.literal("temporal_next")
    ),
    weight: v.number(),           // link strength 0-1
    confidence: v.number(),       // agent certainty 0-1
    humanVerified: v.boolean(),
  }),

  ambiguities: defineTable({
    nodeId: v.id("nodes"),
    question: v.string(),
    options: v.array(v.string()),
    context: v.string(),          // why the agent is uncertain
    resolved: v.boolean(),
    resolution: v.optional(v.string()),
    resolvedBy: v.optional(v.string()),  // "human" | "agent"
  }),

  agentLog: defineTable({
    action: v.string(),
    nodeId: v.optional(v.id("nodes")),
    details: v.string(),
    timestamp: v.number(),
  }),

})
```

### What Each Agent Write Triggers in the UI

```
Agent writes node      →  graph adds animated node
Agent writes edge      →  graph adds animated link
Agent writes log       →  live feed updates
Agent writes ambiguity →  verification card appears
Human resolves         →  node color changes (pending → verified)
```

---

## 6. Agent Pipeline

```
Source (Gmail / Drive / Pennylane / Excel)
        ↓
   [EXTRACT]        Gemini reads native format → text + metadata
        ↓
   [CLASSIFY]       Claude determines: document type, entity,
                    period, probable PCG account
        ↓
   [DEDUPLICATE]    Compare embedding with existing nodes
                    similarity > 0.92 → same_entity edge + flag
        ↓
   [PLACE]          Determine position in hierarchy
                    Write node + parent_of edge
        ↓
   [LINK]           Find cross-references
                    Write references / requires / temporal_next edges
        ↓
   [DETECT]         Is anything uncertain?
                    Write to ambiguities table
        ↓
   [README]         Update parent folder README
                    to include new document in its index
```

---

## 7. Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| KB structure | DAG (tree + cross edges) | Accounting data is inherently multi-dimensional |
| Primary hierarchy | Domain-based (Finance, Compliance, Clients, Operations) | How accountants think, not PCG numbers |
| PCG alignment | As node metadata (`compteNum`) | Available for agent queries, not surface navigation |
| Embeddings storage | In Convex for hackathon | Simplicity; move to Pinecone/pgvector at scale |
| Contradictions | `contradicts` edge + orange render + ambiguity card | Not auto-resolved — a visible, traceable human decision |
| Default collapse depth | ≥ 3 | Graph readability; cross-domain edges always visible |
| Realtime layer | Convex reactive queries | Native behavior, no manual websocket management |