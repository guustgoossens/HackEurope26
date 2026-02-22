# Knowledge Base Structure — DAG, Accounting Specificities & Convex Implementation

*(Moved from `docs/DAG_choices.md`)*

## 1. Why Not a Pure Tree

A tree forces every node to have exactly one parent. This breaks immediately in accounting contexts where a single document belongs to multiple domains simultaneously.

A supplier invoice is at once:
- A financial document (Finance/Invoices/)
- A VAT justification (Compliance/TVA/)
- A client record (Clients/Martin_SARL/)
- Part of an annual closing file (Periods/2024/Q3/)

Forcing it into one branch loses all other relationships. An agent navigating a pure tree will miss cross-domain context, producing incomplete or hallucinated answers.

**Decision: use a Directed Acyclic Graph (DAG)** — a hierarchical backbone (the tree) enriched with explicit cross-domain edges (the pointers). This is the Obsidian model: files live in folders, but links between files create a graph layer on top.

---

## 2. Core Vocabulary

| English | French | Definition |
|---------|--------|------------|
| Node | Nœud | A document, folder, entity, or rule in the KB |
| Edge | Arête / Lien | A directed connection between two nodes |
| Directed edge | Lien orienté | A → B, not necessarily B → A |
| Backlink | Rétrolien | B knows that A points to it |
| Hub node | Nœud hub | Node with many connections, highly central |
| Orphan node | Nœud orphelin | No incoming or outgoing links |
| DAG | Graphe orienté acyclique | Directed graph with no cycles |
| Entity resolution | Résolution d'entités | Identifying that two records refer to the same real-world thing |

---

## 3. French Accounting Specificities

### The FEC (Fichier des Écritures Comptables)

Mandatory normalized CSV with 18 columns. Structured but not semantic:
- `CompteNum` = 411000 means "client account" — but which client?
- `PieceRef` = "FAC2024-089" points to a physical invoice in another system
- `EcritureLib` = "RGt Martin" is free text written differently by every cabinet

The FEC is the central relational document. Every row is a node. Every reference is a potential edge to resolve.

### The Plan Comptable Général (PCG)

A normalized account hierarchy mandated by French law. Classes 1-7 cover all accounting domains. This hierarchy is a **free blueprint** for KB structure — already understood by every French accountant.

The KB aligns with PCG at the metadata level (`compteNum` field on nodes) while presenting domain-based navigation at the surface level (Finance, Compliance, Clients, Operations).

### Mandatory Accounting Cycles — Temporal Dimension

- **Monthly:** VAT declarations (CA3), bank reconciliations
- **Quarterly:** corporate tax installments, quarterly VAT (CA12)
- **Annual:** closing, liasse fiscale, bilan, compte de résultat

Each cycle produces documents that reference previous cycles. Time is a first-class navigation dimension.

### Two-Level KB Structure

```
Cabinet_KB/               ← the firm's own operational knowledge
  └── Rules/              (fiscal rules, procedures, templates)
  └── Procedures/
  └── Templates/

Clients_KB/               ← per-client knowledge
  └── Martin_SARL/
  └── Dupont_SAS/
```

Cross-edges link cabinet rules to the specific clients they apply to.

### The Four Hard Data Problems

1. **Inconsistent naming**: five files named differently that are the same document (or aren't)
2. **Implicit cross-references**: "Following our Tuesday conversation regarding the usual file" — no explicit reference
3. **Quantitative contradictions**: same KPI, two different amounts (HT vs TTC, provisional vs audited — not errors, definitional differences)
4. **Non-text formats**: scanned PDFs, Excel with hidden formulas, legacy CSV with Windows-1252 encoding → handled by Gemini

---

## 4. DAG Data Model (Node + Edge Types)

```typescript
type NodeType =
  | "folder"     // hierarchical container
  | "document"   // source document
  | "entity"     // business entity (client, supplier)
  | "rule"       // business or fiscal rule
  | "period"     // accounting period
  | "readme"     // README for a folder level

type EdgeType =
  | "parent_of"      // hierarchical link (tree backbone)
  | "references"     // A cites or points to B
  | "contradicts"    // A contradicts B — needs human resolution
  | "supersedes"     // A replaces B (newer version)
  | "requires"       // A is incomplete without B
  | "same_entity"    // A and B refer to the same real-world thing
  | "temporal_next"  // B is the next period of A
```

Graph rendering:
- `contradicts` edges → orange
- `same_entity` edges → yellow (potential duplicate)
- `parent_of` edges → muted grey
- Depth ≥ 3 → collapsed by default; cross-domain edges always visible

---

## 5. Current Convex Implementation vs Full DAG

The current `schema.ts` implements a **simplified tree** (not the full DAG) — `knowledge_tree` with `parentId` for hierarchy, `knowledge_entries` for content. This is sufficient for the hackathon demo.

The full DAG (nodes + edges tables with typed edge relationships) is the longer-term architecture. The `DAG_choices.md` original document contains the full Convex schema for a future migration.

**Why simplified for now:** The hackathon needs the pipeline to work end-to-end. Full DAG traversal and edge resolution add complexity without changing the demo narrative. The tree is already inspectable and navigable.
