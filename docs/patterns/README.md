# Patterns & Inspirations

Five design patterns that shaped the architecture. Each has an external inspiration source, a concrete problem it solved, and direct code references.

---

## Summary

| Pattern | Source | Problem It Solved | Key Files |
|---------|--------|-------------------|-----------|
| [Capabilities-focused prompts](./01-capabilities-focused-prompts.md) | ClawdBot / OpenClaw | Restrictive "do NOT" prompts killed agent resourcefulness | `explorer.py:40-89`, `structurer.py:46-78` |
| [Mechanical loop detection](./02-mechanical-loop-detection.md) | OpenClaw tool-loop-detection.ts | `MAX_CONSECUTIVE_ERRORS` missed semantic loops | `loop_detection.py`, all 3 agent loops |
| [Agent forum](./03-agent-forum.md) | Moltbook | Cross-engagement knowledge accumulation with no human posters | `schema.ts:94-109`, `forum.ts`, `definitions.py:88-116` |
| [Verification questionnaire](./04-verification-questionnaire.md) | Original product vision | Agents hallucinate on ambiguous data; humans need a structured resolution path | `master_agent.py` verify phase |
| [Navigable knowledge tree](./05-knowledge-tree.md) | Skill distillation concept | Flat RAG loses structure; agents need a navigable hierarchy | `schema.ts:71-92` |

---

## How to Read These Docs

Each pattern doc has three sections:

1. **Source** — where the idea came from (external project, paper, or original concept)
2. **Problem** — the concrete failure mode it addresses
3. **Implementation** — how we applied it, with exact code references

The patterns interact: loop detection makes capability-focused prompts safe (agents won't spiral forever), and the forum + knowledge tree together form the two-tier knowledge layer (dynamic operational guides + static verified KB).
