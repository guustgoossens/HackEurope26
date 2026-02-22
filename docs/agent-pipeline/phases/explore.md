# Phase 1: Explore

## What Happens

MasterAgent spawns one `ExplorerAgent` per connected data source and runs them concurrently. Each explorer independently crawls its source, checks the forum for prior guides, writes new discoveries, and reports metrics.

```
MasterAgent
    │
    ├──▶ ExplorerAgent (gmail source)   ──┐
    ├──▶ ExplorerAgent (drive source)   ──┤  asyncio.gather — concurrent
    └──▶ ExplorerAgent (sheets source)  ──┘
                                          │
                                     SubAgentReports
                                          │
                                     MasterAgent merges + advances to Structure
```

## Explorer Loop (per agent)

1. Build system prompt with runtime line (see [sub-agents/explorer.md](../sub-agents/explorer.md))
2. Call Claude with tool list (Google Workspace + forum + sandbox)
3. Execute tool calls, record in `ToolLoopDetector`
4. Check `detector.is_stuck()` — break if looping
5. When agent calls `report_metrics` — capture metrics locally, emit to Convex, end loop

Max turns: **10**

## Outputs

- Forum entries written (`write_to_forum`) — operational guides for future agents
- Exploration metrics upserted to Convex (`explorations` table)
- `SubAgentReport` with `metrics` and `findings` returned to MasterAgent
- Agent events emitted to Convex (visible in UI real-time)

## Tools Available

See [tools.md — Explorer Tools](../tools.md#explorer-tools) and [tools.md — Sandbox Tools](../tools.md#sandbox-tools).
