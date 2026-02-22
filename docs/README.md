# HackEurope26 — Documentation

Agent-ready data infrastructure for SMEs. Connects scattered business data (Gmail, Drive, Sheets) and organizes it into a structured, verified, AI-navigable knowledge base.

---

## Navigation

| Section | What |
|---------|------|
| [getting-started/](./getting-started/README.md) | Quick start, environment setup, all env vars, commands |
| [architecture/](./architecture/README.md) | System diagram, data model, HTTP API, auth, real-time flow |
| [agent-pipeline/](./agent-pipeline/README.md) | 5-phase pipeline, sub-agents, tools, loop detection, Composio |
| [patterns/](./patterns/README.md) | 5 design patterns with source inspirations and code references |
| [convex/](./convex/README.md) | Convex schema, functions, forum deep-dive |
| [frontend/](./frontend/README.md) | React components, routing, phase panels |
| [decisions/](./decisions/README.md) | 10 architectural decisions with rationale |
| [product/](./product/pitch.md) | Pitch script, Q&A, demo flow |

---

## What It Does

**5-phase pipeline:**

```
Onboard → Explore → Structure → Verify → Use
```

1. **Onboard** — connect Gmail, Drive, Sheets
2. **Explore** — concurrent agents crawl each source, write operational guides to the [agent forum](./patterns/03-agent-forum.md)
3. **Structure** — Claude designs a knowledge tree, structurer agents extract and classify content, flag contradictions
4. **Verify** — human answers a structured questionnaire to resolve ambiguities (see [verification questionnaire pattern](./patterns/04-verification-questionnaire.md))
5. **Use** — knowledge writer populates the verified KB; any future agent can navigate it hierarchically

**Output:** a hierarchical, verified knowledge base with confidence scores and source references — any agent can navigate it precisely without brute-force RAG.

---

## Key Design Patterns

→ [patterns/README.md](./patterns/README.md) — full summary table

- **Capabilities-focused prompts** (ClawdBot/OpenClaw) — environment-descriptive system prompts, not rule-based
- **Mechanical loop detection** (OpenClaw) — hash-based stuck-agent prevention
- **Agent forum** (Moltbook) — agents as posters solve cross-engagement cold-start
- **Verification questionnaire** — human-in-the-loop for ambiguous data
- **Navigable knowledge tree** — skill distillation as external hierarchical library

---

## Current Status (Feb 2026)

- Core pipeline: working end-to-end (explore → structure → verify → use)
- Loop detection: working; known gap with semantic variants
- Composio Google Workspace: debugging (agent ignores pre-connected tools, see [agent-pipeline/composio.md](./agent-pipeline/composio.md))
- Forum with metadata filters: working

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 19 + Vite 7 + Tailwind CSS 4 |
| Backend | Convex (real-time reactive BaaS) |
| Auth | WorkOS AuthKit |
| Agent pipeline | Python 3.12 + uv + anthropic + httpx |
| LLMs | Claude (orchestration) + Gemini (multimodal extraction) |
| Integrations | Composio (Google Workspace) |

---

## Previous Flat Docs

The original flat docs remain for reference:
- `docs/README.md` — this file (updated)
- `docs/architecture.md` — superseded by [architecture/](./architecture/README.md)
- `docs/agent_pipeline.md` — superseded by [agent-pipeline/](./agent-pipeline/README.md)
- `docs/DECISIONS.md` — superseded by [decisions/DECISIONS.md](./decisions/DECISIONS.md)
- `docs/tech_stack.md` — superseded by [getting-started/setup.md](./getting-started/setup.md)
- `docs/built.md` — superseded by [convex/functions.md](./convex/functions.md) + [frontend/components.md](./frontend/components.md)
- `docs/DAG_choices.md` — superseded by [decisions/knowledge-base-structure.md](./decisions/knowledge-base-structure.md)
- `docs/Pitch_notes_Emeric.md` — superseded by [product/pitch.md](./product/pitch.md)
