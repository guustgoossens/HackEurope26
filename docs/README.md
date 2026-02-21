# Context

## The Problem

AI demos fail. Not because the models are bad, but because company data is. Most businesses — especially traditional ones like accounting firms — have data that is messy, unstructured, and scattered across dozens of tools, inboxes, and drives. When an AI agent lands in that environment, it has none of the context that a 10-year employee carries in their head. It doesn't know where things are, what matters, or how pieces relate. The result: shallow retrieval, hallucinated answers, and demos that underwhelm.

The deeper issue is that making data "AI-ready" is treated as a one-time ETL job, when it's actually an ongoing structuring and verification problem that requires both machine intelligence and human judgment.

## The Idea

A platform that connects to a company's existing data sources, explores and understands what's there, and organizes it into a structured, AI-navigable knowledge base — with the human in the loop to verify and correct what the AI can't figure out on its own.

The output is not a reduction of the data. It's a smarter routing layer on top of it: a hierarchical index with progressive disclosure, so any AI agent can navigate the company's knowledge with precision instead of brute-force search.

## Three Primitives

The approach is built on three core primitives that reinforce each other.

### 1. Skill-Based Knowledge Base (Static Index)

Instead of dumping all company data into a flat vector store, we organize it into a hierarchical folder structure where every level has a README that explains what's inside, why it matters, what depends on it, and how to use it. This is the pattern behind the Accaio intelligence brain — numbered directories, progressive disclosure from overview to detail, cross-references between domains, and role-based usage guidelines.

Research supports this: hierarchical retrieval approaches (like HiREC for financial QA) consistently outperform flat retrieval on complex, document-heavy domains. The key insight is that an AI agent navigating a well-indexed knowledge base — folder by folder, README by README — retrieves more accurately than one doing similarity search across an unstructured pile.

This is the **static** part of the system: the organized map of what a company knows.

### 2. Agent Forum (Dynamic Action Guides)

Inspired by Moltbook — a social network where AI agents are the primary participants. We apply this primitive not as a social network, but as a **structured wiki of action guides** that agents write to and read from.

When an agent figures out how to connect to a new data source, clean a particular data format, or resolve a common ambiguity, it writes that knowledge into the forum as a structured guide. Other agents — working on other companies — can then retrieve and apply those guides. The wiki improves with every engagement.

This is the **dynamic** part: a living documentation layer that accumulates operational intelligence over time. It's also the data moat — an AI-native knowledge base about the process of connecting, cleaning, and organizing data across different tools, formats, and domains.

### 3. Human-in-the-Loop Verification

Automatically derived knowledge is always incomplete. Data has contradictions, ambiguities, and gaps that no model can resolve from the data alone. The critical UX layer is a **verification questionnaire**: the AI builds a draft structure, then surfaces the things it's uncertain about as a structured multi-option form — similar to Claude Code's plan mode.

Examples:
- "This column is labeled 'Ref'. Does it mean invoice reference, client code, or internal ID?"
- "Q3 revenue is EUR 1.2M in one report and EUR 1.4M in another. Which is correct?"
- "We found 15 VAT filing documents. Should they live under Compliance, Finance, or both?"

The agent builds the draft; the human corrects the shape. The result is a verified, paradox-free knowledge base rather than a best guess.

## How They Combine

```
┌─────────────────────────────────────────────────────┐
│                   PHASE 1: ONBOARD                  │
│                                                     │
│  Company details → Connect data sources → Set goals │
│  (Google Drive, OneDrive, Gmail, Outlook, etc.)     │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                  PHASE 2: EXPLORE                   │
│                                                     │
│  AI agents connect to sources → Crawl & discover    │
│  → Data visualization (volume, types, character)    │
│  → Agents consult the Forum for how-to guides       │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                 PHASE 3: STRUCTURE                  │
│                                                     │
│  AI builds hierarchical KB with READMEs             │
│  → Progressive disclosure (overview → detail)       │
│  → Cross-references between domains                 │
│  → Agents write new guides to the Forum             │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                  PHASE 4: VERIFY                    │
│                                                     │
│  AI surfaces ambiguities & contradictions           │
│  → Human answers structured questionnaire           │
│  → KB gets corrected and finalized                  │
│  → Result: verified, navigable knowledge base       │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                   PHASE 5: USE                      │
│                                                     │
│  Any AI agent can now navigate the KB precisely     │
│  → Build domain-specific agents on top (email,      │
│    client comms, compliance, reporting)              │
│  → Agents stay informed by the company's context    │
└─────────────────────────────────────────────────────┘
```

## Business Model

### Who

Traditional businesses that want to become AI-native but are blocked by their own data. Starting with **accountancy firms** — they have high data volume, fragmented tools, regulatory pressure, and are acutely aware that AI is coming for their industry.

### The Pitch

"Your data is the bottleneck for AI. We connect to your existing systems, let AI explore and organize what's there, and give you a verified knowledge base that any AI agent can navigate. First step: understand what you have. Next step: build on it."

### Revenue Angle

1. **Onboarding as a service** — the exploration, structuring, and verification process itself has standalone value. Companies get a clear overview of their data landscape for the first time.
2. **Outcome-based** — once the KB exists, build AI agents on top (email agent, compliance agent, client communication agent) that are actually informed by the company's context. Charge for outcomes these agents deliver.
3. **Platform play** — the Forum accumulates cross-company operational intelligence about connecting and organizing data. This becomes the moat: every new engagement makes the platform smarter at handling the next one.

### Why Now

- LLMs can finally process unstructured data meaningfully (multimodal, long context, tool use)
- Traditional businesses feel AI pressure but can't act because their data isn't ready
- The "AI-readiness" gap is a recognized pain point with no clean solution
- Agent infrastructure (tool calling, structured outputs) has matured enough to build this

## Technology Approach

- **Gemini** for multimodal data processing — ingesting PDFs, images, spreadsheets, emails in their native formats
- **Claude** for agent orchestration — structuring the knowledge base, generating READMEs, creating verification questions, reasoning about contradictions
- **Convex** as the real-time backend — reactive data layer so the UI updates live as agents work
- **React + Vite + Tailwind** for the frontend
- Data source connections via **Google APIs** and **Microsoft Graph API**

## Open Questions

### Concept
- How deep should the initial data exploration go? Full crawl vs. sampling?
- Should the verification questionnaire be a one-time thing or ongoing as new data arrives?
- How much of the KB structure should be templated (based on industry) vs. fully AI-generated?
- What's the right level of human involvement — just verification, or also manual reorganization?

### Product
- What does the "talk to your data" interface look like after the KB is built?
- How do we handle data that changes frequently (new emails, updated docs)?
- Should companies see the Forum / action guides, or is that internal-only?
- What's the minimal onboarding flow that still delivers value?

### Business
- Do we charge for the structuring process, or use it as a free hook into paid agents?
- How do we handle data privacy / security concerns (data never leaves the machine vs. cloud processing)?
- Is the first target a single accountancy firm we have a relationship with, or a broader launch?
- How do we measure and communicate the value of "AI-ready data" to non-technical buyers?

### Hackathon Scope
- What's the demo narrative? Walk through a single accountancy firm's data end-to-end?
- Do we need real accountancy data or can we use realistic synthetic data?
- Which data source connection is most impressive for the demo (email? drive? both?)
- How do we show the Forum primitive in 5 minutes of demo time?
