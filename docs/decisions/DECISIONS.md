# Decisions

Key architectural and product decisions, with rationale.

---

## Hierarchical KB over Vector Store

**Decision:** Organize company knowledge as a hierarchical tree (domain > skill > entry_group) with READMEs at every level, instead of a flat vector store.

**Why:**
- Flat vector search fails on complex, multi-document domains — similarity != relevance
- Hierarchical retrieval (like HiREC for financial QA) consistently outperforms flat retrieval
- A folder-like structure with progressive disclosure lets AI agents navigate by context, not just embedding distance
- Mirrors how domain experts actually think — categories, sub-categories, specifics
- The tree structure is inspectable and editable by humans; a vector store is a black box

**Alternative considered:** RAG with chunked embeddings. Rejected because it collapses structure and loses document relationships.

---

## Gemini for Multimodal, Claude for Orchestration

**Decision:** Split LLM responsibilities — Gemini handles multimodal extraction (PDFs, images, spreadsheets), Claude handles agentic orchestration and reasoning.

**Why:**
- Gemini excels at multimodal ingestion — native PDF/image understanding, large context for spreadsheets
- Claude excels at structured tool use, multi-step reasoning, and generating coherent knowledge structures
- Separation of concerns: extraction is a different capability than orchestration
- Allows swapping either model independently as better options emerge

**Alternative considered:** Claude for everything. Rejected because Gemini's multimodal extraction is stronger for raw file processing.

---

## Convex as Real-Time Backend

**Decision:** Use Convex instead of a traditional REST API + database.

**Why:**
- Reactive queries mean the dashboard updates instantly as agents work — no polling needed on frontend
- File-based routing with auto-generated types eliminates API boilerplate
- Built-in full-text search (used for forum entries)
- Schema-first with validators — type safety from DB to frontend with zero glue code

**Alternative considered:** Supabase (Postgres + realtime). Rejected because Convex's reactive model is more natural for this use case.

---

## Python Agent Pipeline (not TypeScript)

**Decision:** Write the agent pipeline in Python, separate from the TypeScript frontend/backend.

**Why:**
- Python has the best LLM SDK ecosystem (anthropic, google-generativeai, composio)
- Async/await with httpx is clean for concurrent agent execution
- Pydantic for config and data validation
- uv for fast dependency management
- Keeps agent logic decoupled from the web layer — agents could run anywhere

**Alternative considered:** TypeScript agents using Convex actions. Rejected because Convex actions have execution time limits, and the Python LLM ecosystem is more mature.

---

## HTTP Bridge (Python → Convex)

**Decision:** Agents communicate with Convex via HTTP endpoints (`convex/http.ts`), not the Convex client SDK.

**Why:**
- Convex doesn't have a Python SDK — HTTP is the only option for cross-language communication
- 11 focused endpoints map cleanly to agent operations
- Bearer token auth keeps it simple
- Internal mutations behind HTTP endpoints means agents can write to the DB without exposing mutations publicly

**Trade-off:** No reactive subscriptions from Python side. Agents poll for responses (questionnaire) with exponential backoff.

---

## Direct HTTP Pipeline Trigger (not Convex Action)

**Decision:** Frontend triggers the pipeline via direct HTTP POST to the Python agent server, not a Convex action.

**Why:**
- Convex actions have execution time limits — the pipeline runs for minutes
- Direct HTTP decouples pipeline start from Convex
- Simpler error handling on both sides

**Changed from:** `useAction(triggerPipeline)` calling a Convex action that spawned the pipeline. Changed Feb 2026.

---

## WorkOS AuthKit for Authentication

**Decision:** Use WorkOS AuthKit.

**Why:**
- First-class Convex JWT integration
- Enterprise-ready (SSO, directory sync) — relevant for B2B accounting firm target
- The starter template gave a working auth setup in minutes

**Alternative considered:** Clerk. WorkOS chosen for enterprise positioning.

---

## Phase-Based Pipeline (not Event-Driven)

**Decision:** Strict 4-phase sequence (Explore → Structure → Verify → Use) rather than event-driven.

**Why:**
- Each phase depends on the output of the previous one
- Sequential phases make UI straightforward — show where you are and what's next
- Human-in-the-loop (Phase 3) is a natural checkpoint requiring waiting
- Simpler to debug than a DAG of async events

**Trade-off:** Can't skip phases or run out of order.

---

## Capabilities-Focused Agent Prompts (not Restrictive)

**Decision:** Write agent system prompts in a capabilities-focused style (describe the environment and available tools) rather than a restrictive style (long lists of "do NOT" instructions).

**Why:**
- Restrictive prompts kill agent resourcefulness — ClawdBot/OpenClaw demonstrated this clearly
- Observed real cases of agents refusing valid approaches because they felt adjacent to a "do NOT" item
- Capabilities description: agent knows what it has without being told what it doesn't have
- The OpenClaw "runtime line" style gives dense environment context in one line

**Caveat:** When a specific pre-configured integration exists (e.g., Composio for Google Workspace), trust statements must be specific, not generic. "Authentication is pre-configured" is not enough — you need "call GMAIL_LIST_EMAILS directly, don't install google packages".

**Changed from:** Restrictive prompt with explicit "do NOT install packages, do NOT look for token.json..." list. Changed Feb 2026.

---

## Mechanical Loop Detection (not Error Counter)

**Decision:** Detect stuck agent loops by hashing tool calls and tracking repeats in a sliding window, rather than counting consecutive errors.

**Why:**
- `MAX_CONSECUTIVE_ERRORS` counter misses semantic loops — same tool, different error messages, counter resets on success
- Hash-based detection catches exact repeats regardless of error status
- No prompt hacks needed — infrastructure-level stop

**Known gap:** Semantic variants (same operation, different argument strings) produce different hashes and are not caught. Needs additional normalization for tools like `run_command` and `install_package`.

**Changed from:** `MAX_CONSECUTIVE_ERRORS = 3` in each agent loop. Changed Feb 2026.

---

## Forum as Cross-Company Knowledge (Agent-Written)

**Decision:** The forum is a structured wiki that agents write to and read from across all client engagements — not a human-facing feature.

**Why:**
- Operational intelligence accumulates across engagements (the data moat)
- Agents consult the forum before starting — avoids re-learning known patterns
- Full-text search + metadata filters make retrieval precise
- Structured `sourceType`/`phase`/`fileType` filter fields enable targeted retrieval without noise

**Open question:** Should clients ever see the forum content, or is it internal-only?
