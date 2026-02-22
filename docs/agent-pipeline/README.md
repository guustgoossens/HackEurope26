# Agent Pipeline

The Python agent system that explores, structures, verifies, and populates the knowledge base.

Entry point: `agents/src/agents/main.py`
Orchestrator: `agents/src/agents/master_agent.py`

---

## Overview

```
CLI: uv run python -m agents.main --client-id <convex-id>
                    │
                    ▼
            ┌──────────────┐
            │ MasterAgent  │  Orchestrator — runs all 4 phases sequentially
            └──────┬───────┘
                   │
    ┌──────────────┼──────────────────────────┐
    │              │                          │
    ▼              ▼                          ▼
┌──────────┐ ┌──────────────┐ ┌─────────────────────┐
│ Explorer │ │  Structurer  │ │  KnowledgeWriter    │
│ Agent(s) │ │  Agent(s)    │ │  Agent              │
└──────────┘ └──────────────┘ └─────────────────────┘
  Phase 1       Phase 2            Phase 4
  Explore       Structure          Use
                     Phase 3 (Verify) is handled by MasterAgent directly
```

---

## Phases

| Phase | Doc | Who Runs It | Output |
|-------|-----|-------------|--------|
| 1. Explore | [phases/explore.md](./phases/explore.md) | ExplorerAgent (concurrent, one per source) | Forum entries + metrics |
| 2. Structure | [phases/structure.md](./phases/structure.md) | StructurerAgent (concurrent batches) | Knowledge tree + contradictions |
| 3. Verify | [phases/verify.md](./phases/verify.md) | MasterAgent directly (polls for human input) | Resolved contradictions |
| 4. Use | [phases/use.md](./phases/use.md) | KnowledgeWriterAgent | Knowledge entries |

---

## Sub-Agents

| Agent | Doc | Max Turns | Tools |
|-------|-----|-----------|-------|
| ExplorerAgent | [sub-agents/explorer.md](./sub-agents/explorer.md) | 10 | Google Workspace + sandbox + forum |
| StructurerAgent | [sub-agents/structurer.md](./sub-agents/structurer.md) | 20 | extract/classify + contradiction + forum |
| KnowledgeWriterAgent | [sub-agents/knowledge-writer.md](./sub-agents/knowledge-writer.md) | 25 | write_knowledge_entry + flag_contradiction |

---

## Infrastructure

| Doc | What |
|-----|------|
| [tools.md](./tools.md) | All tool definitions with parameters and filter fields |
| [loop-detection.md](./loop-detection.md) | ToolLoopDetector — mechanical stuck-loop prevention |
| [sandbox.md](./sandbox.md) | Sandbox infrastructure — allowlisted commands for file processing |
| [composio.md](./composio.md) | Composio integration — pre-connected Google Workspace tools |

---

## Patterns Used

All three sub-agents apply:
- [Capabilities-focused prompts](../patterns/01-capabilities-focused-prompts.md) — environment-descriptive system prompts, not rule-based
- [Mechanical loop detection](../patterns/02-mechanical-loop-detection.md) — `ToolLoopDetector` in every agentic loop
- [Agent forum](../patterns/03-agent-forum.md) — agents read/write operational guides across engagements
