# ExplorerAgent

`agents/src/agents/sub_agents/explorer.py`

---

## Role

Discovers what data is available in a single data source (Gmail, Drive, or Sheets). Runs concurrently with other explorer agents — one per source.

## System Prompt

Capabilities-focused style (see [patterns/01](../../patterns/01-capabilities-focused-prompts.md)):

```
You are an explorer agent investigating a {source_type} data source labeled "{source_label}".

## Goal
Discover what data is available, understand its structure, report findings via report_metrics.

## Environment
auth: composio | workspace: /tmp/hackeurope_abc123 | sandbox: allowlisted commands
Google Workspace access is pre-configured — the Google tools below have authentication handled.

## Available Tools
Google Workspace (auth pre-configured):
  - GMAIL_LIST_EMAILS
  - ...

Sandbox (local file processing):
  - download_file
  - run_command
  ...

When done, call report_metrics with a summary of what you found.
```

## Constructor

```python
ExplorerAgent(
    llm: AnthropicAdapter,
    executor: HybridToolExecutor,
    convex: ConvexClient,
    client_id: str,
    source_type: str,          # "gmail" | "drive" | "sheets"
    source_label: str,         # human-readable name
    tools: list[dict] | None,  # merged tool schemas (Composio + custom)
    tool_names: list[str] | None,  # for system prompt categorization
    auth_mode: str,            # "composio" | "google_oauth"
    workspace_path: str | None,
)
```

## Agentic Loop

Max turns: **10**. Uses `ToolLoopDetector(repeat_threshold=3, history_size=20)`.

Termination conditions:
- `report_metrics` tool called → metrics captured, loop ends
- No tool calls in response → loop ends naturally
- `detector.is_stuck()` → loop breaks with warning
- `max_turns` reached

## Outputs

Returns `SubAgentReport`:
```python
@dataclass
class SubAgentReport:
    agent_name: str       # "explorer-gmail"
    source_type: str      # "gmail"
    metrics: dict         # from report_metrics tool call
    findings: list[str]   # metric summaries
    messages: list[str]   # any message_master calls (unused by explorer)
    contradictions: list  # any contradictions (unused by explorer)
```

## Tools

See [tools.md — Explorer Tools](../tools.md#explorer-tools) and [tools.md — Sandbox Tools](../tools.md#sandbox-tools).
