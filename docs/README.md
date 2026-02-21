# Project Context: Agent-Ready Data Infrastructure for SMEs

## Vision

**Long-term:** Build the infrastructure layer that makes any company agent-ready. 
Today, SMEs and traditional businesses have chaotic, fragmented data — Excel files, 
forgotten Airtables, emails, cloud systems built by external contractors they don't 
control. When an agentic workforce arrives (and it's arriving now), these companies 
will be paralyzed: no context, no organizational memory, no navigable structure. 
We build the layer that fixes that.

**Short-term (hackathon focus):** Prove the concept on French accounting firms 
(cabinets d'expertise comptable). 19,500 firms in France, 70% are TPEs (<10 people), 
all facing AI disruption, all with fragmented data across multiple tools. 
Perfect beachhead market.

## The Core Problem

AI agents fail in enterprise environments not because models are bad, but because 
company data is unstructured and unnavigable. A new agent arriving at an SME is 
like a consultant on day one — zero context, zero access, zero efficiency.

The solution is not better RAG. It's a **hierarchical, verified knowledge base** 
that any agent can navigate precisely, built by AI agents with human verification 
in the loop.

## Three Core Primitives

1. **Skill-Based Knowledge Base (Static)** — hierarchical folder structure where 
every level has a README explaining what's inside, why it matters, dependencies, 
and usage guidelines. Progressive disclosure from overview to detail. 
Outperforms flat vector stores on complex document-heavy domains.

2. **Agent Forum (Dynamic)** — structured wiki of action guides that agents 
write to and read from. When an agent figures out how to connect a data source 
or resolve a format ambiguity, it writes that as a reusable guide. 
Living documentation that improves with every engagement. The data moat.

3. **Human-in-the-Loop Verification** — AI builds draft KB structure, 
surfaces ambiguities as structured questionnaires. 
Examples: "This column 'Ref' — is it invoice reference, client code, or internal ID?" 
Human corrects the shape. Output: verified, paradox-free knowledge base.

## 5-Phase Product Flow

1. **Onboard** — connect data sources (Google Drive, OneDrive, Gmail, Outlook)
2. **Explore** — agents crawl and discover, data visualization of what exists
3. **Structure** — AI builds hierarchical KB with READMEs and cross-references
4. **Verify** — human answers structured questionnaire to resolve ambiguities
5. **Use** — any agent can navigate the KB; build domain agents on top

## Tech Stack

- **Gemini** — multimodal data processing (PDFs, images, spreadsheets, emails)
- **Claude** — agent orchestration, KB structuring, README generation, 
  contradiction reasoning
- **Convex** — real-time reactive backend (UI updates live as agents work)
- **React + Vite + Tailwind** — frontend
- **Google APIs + Microsoft Graph API** — data source connectors
- **react-force-graph** — knowledge graph visualization (Obsidian-style)
- **Recharts** — data landscape visualization (treemap/bubble charts)

## Hackathon Scope (12 hours total: ~8h today + 4h tomorrow morning)

**Demo narrative:** One French accounting firm, messy real-world data, 
watch the system explore → structure → ask for verification → produce navigable KB.

**Focus on phases 2 + 3 + 4 only.** Phase 5 shown as pre-built result.

**Two key visualizations:**
- Data landscape view (Phase 2): bubble/treemap showing data volume by source and type
- Knowledge graph (Phase 3): force-directed graph showing KB hierarchy + cross-references

Use **synthetic but realistic** accounting firm data for the demo.

## Team & Roles

- **Emeric** — product design, frontend, pitch & demo ownership
- **Emily** — data, data visualization
- **Guust + Elie** — ML, agentic tech, backend dev

## Competitive Landscape

Existing tools (Pennylane, Dext, Cegid, Inqom, Agiris) all do the same thing: 
automate accounting data entry and production. Level 1.

**Nobody is building the organizational knowledge layer.** 
That's the gap. Not processing client accounting data — 
structuring the firm's own operational knowledge to support agents.

## Key Differentiators

- Hierarchical KB outperforms flat RAG on complex document-heavy domains
- Human verification loop produces paradox-free output (not best-guess)
- Agent Forum creates cross-company operational intelligence moat
- RGPD/data sovereignty angle is a real selling point for French accounting firms

## Constraints & Principles

- Data never leaves the client environment (important for accounting firms + RGPD)
- Human judgment is not optional — it's a feature, not a fallback
- Start with the concrete accounting case, open to "this works for any company" later
- Don't over-pitch the vision upfront — anchor on the specific problem first

## What "Done" Looks Like for the Hackathon

A live demo showing:
1. Chaotic input data (emails + Drive docs + Excel) from a fictional accounting firm
2. Agent exploring and mapping what exists (data landscape viz)
3. Agent building a structured KB (knowledge graph appearing in real-time via Convex)
4. Verification questionnaire surfacing 3-4 ambiguities for human input
5. Final navigable KB — and a domain agent answering a precise question using it