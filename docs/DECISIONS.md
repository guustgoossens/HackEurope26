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

**Alternative considered:** Claude for everything. Rejected because Gemini's multimodal extraction is stronger for raw file processing. Single-model would also create a bottleneck.

---

## Convex as Real-Time Backend

**Decision:** Use Convex instead of a traditional REST API + database.

**Why:**
- Reactive queries mean the dashboard updates instantly as agents work — no polling needed
- File-based routing with auto-generated types eliminates API boilerplate
- Built-in full-text search (used for forum entries)
- Schema-first with validators — type safety from DB to frontend with zero glue code
- Fits the hackathon timeline — less infra to set up

**Alternative considered:** Supabase (Postgres + realtime). Rejected because Convex's reactive model is more natural for this use case, and the DX is faster for prototyping.

---

## Python Agent Pipeline (not TypeScript)

**Decision:** Write the agent pipeline in Python, separate from the TypeScript frontend/backend.

**Why:**
- Python has the best LLM SDK ecosystem (anthropic, google-generativeai, google-api-python-client)
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
- 11 focused endpoints map cleanly to agent operations (emit event, add contradiction, create node, etc.)
- Bearer token auth keeps it simple — single shared secret
- Internal mutations behind HTTP endpoints means agents can write to the DB without exposing mutations publicly

**Trade-off:** No reactive subscriptions from Python side. Agents poll for responses (questionnaire) with exponential backoff instead.

---

## WorkOS AuthKit for Authentication

**Decision:** Use WorkOS AuthKit instead of rolling custom auth or using Clerk/Auth0.

**Why:**
- First-class Convex integration via JWT
- Enterprise-ready (SSO, directory sync) without extra work — relevant for B2B accounting firm target
- Clean React SDK (`@workos-inc/authkit-react`)
- The starter template (convex-react-vite-authkit) gave us a working auth setup in minutes

**Alternative considered:** Clerk (also has Convex integration). WorkOS chosen for enterprise positioning.

---

## Phase-Based Pipeline (not Event-Driven)

**Decision:** The agent pipeline follows a strict 4-phase sequence (Explore → Structure → Verify → Use) rather than an event-driven architecture.

**Why:**
- Each phase depends on the output of the previous one — exploration findings feed structuring, contradictions feed verification
- Sequential phases make the UI straightforward — show the user where they are and what's next
- Human-in-the-loop verification (Phase 3) is a natural checkpoint that requires waiting
- Simpler to debug and reason about than a DAG of async events

**Trade-off:** Less flexible than a fully event-driven system. Can't easily skip phases or run them out of order. Acceptable for the current scope.

---

## Sub-Agent Parallelism per Data Source

**Decision:** In Explore and Structure phases, spawn one sub-agent per data source and run them concurrently.

**Why:**
- Data sources are independent — exploring Gmail doesn't affect exploring Drive
- Concurrency cuts wall-clock time proportionally to the number of sources
- Each sub-agent has its own tool executor and message history — no shared state conflicts
- SubAgentReports are collected and merged by the MasterAgent after all complete

**Trade-off:** More concurrent API calls to LLM providers. Managed by keeping max_turns per agent bounded (15-25).

---

## Tool Interception Pattern

**Decision:** Some tools (report_metrics, add_contradiction, message_master) are intercepted at the agent level before/after executor invocation, rather than handled purely by the executor.

**Why:**
- Agents need to track results locally (e.g., building a SubAgentReport) while also persisting to Convex
- Interception allows dual-write: update local state + call Convex HTTP endpoint
- Keeps the executor generic — it doesn't need to know about agent-level state

---

## Forum as Cross-Company Knowledge (Agent-Written Wiki)

**Decision:** The forum is a structured wiki that agents write to and read from, not a human-facing feature.

**Why:**
- Operational intelligence (how to connect to Gmail, how to parse Dutch tax documents) accumulates across engagements
- Agents consult the forum before starting exploration — avoids re-learning known patterns
- Full-text search in Convex makes retrieval simple
- This is the data moat: every engagement makes the platform smarter

**Open question:** Should companies ever see the forum content, or is it internal-only?
