# Composio Integration

**Status: Active debugging (Feb 2026)**

Composio provides pre-connected Google Workspace tools (Gmail, Drive, Sheets) so agents don't need to manage OAuth credentials directly.

---

## Current Status

Google OAuth connects successfully via Composio. However, the explorer agent is currently ignoring Composio tools and attempting to DIY Google auth instead. See [Known Issues](#known-issues) below.

What is working:
- Pipeline starts and completes
- Forum search/create working
- Knowledge tree + entries created in Convex
- Sandbox blocklist correctly rejects `env | grep` attempts

---

## Architecture

```
User connects Google account
        │
        ▼
Composio OAuth flow (via composio_client.py)
        │
        ▼
ComposioIntegration.get_entity(user_id)
        │
        ▼
HybridToolExecutor
  ├── custom_executor  (forum, sandbox, non-Google tools)
  └── composio         (GMAIL_*, GOOGLEDRIVE_*, GOOGLESHEETS_* tools)
        │
        ▼
ExplorerAgent.run() — tools merged from both executors
```

### Per-Toolkit Auth IDs

```python
# composio_client.py
composio_user_id = f"{composio_user_prefix}_{client_id}"
# e.g. "hackeurope26_abc123def456"
```

Each client gets a unique Composio entity ID. Multiple toolkits (Gmail, Drive, Sheets) can be connected per entity.

### HybridToolExecutor

`agents/src/agents/tools/hybrid_executor.py` merges tool schemas from Composio and the custom executor:

```python
class HybridToolExecutor:
    def __init__(self, custom_executor: ToolExecutor, composio: ComposioIntegration, composio_user_id: str)
    def get_merged_tools(self, custom_schemas: list[dict]) -> list[dict]
    async def execute(self, call: ToolCall) -> ToolResult
```

`get_merged_tools()` returns Composio tool schemas + custom tool schemas in a single list. When the agent calls a tool, `execute()` routes it to the right executor.

---

## Known Issues

### 1. Explorer Ignores Composio Tools (Critical)

The explorer agent consistently tries to install `google-api-python-client` and look for `token.json` instead of calling `GMAIL_LIST_EMAILS` etc. directly.

Root cause: the agent sees both `run_command` and `install_package` in its tool list, and the familiar Python-credential path feels more concrete than trusting a generic "pre-configured" claim.

**System prompt currently says:**
```
Google Workspace access is pre-configured — the Google tools below have authentication handled.
```

**What it needs to say (specific, not generic):**
```
Call GMAIL_LIST_EMAILS, GOOGLEDRIVE_SEARCH_FILES, GOOGLESHEETS_GET_SPREADSHEET_INFO directly.
Do NOT install google packages. Do NOT look for token.json or credential files.
Authentication is handled by Composio — the tools are ready to call.
```

See [patterns/01 — The Tension with Pre-Configured Integrations](../patterns/01-capabilities-focused-prompts.md#the-tension-with-pre-configured-integrations).

### 2. Loop Detector Misses pip Install Variants

Different pip install strings hash differently, so the loop detector doesn't catch the spiral. See [patterns/02 — Known Gap](../patterns/02-mechanical-loop-detection.md#known-gap-semantic-variants).

### 3. `_make_fake_response` in HybridExecutor

`hybrid_executor.py:56-71` creates a fake response object to satisfy Composio's `handle_tool_calls` interface. If the Composio SDK inspects the response type closely (e.g., checks `isinstance(response, anthropic.Message)`), this will silently fail. Needs verification with the actual Composio SDK version in use.

---

## Environment Variables

```
# agents/.env
COMPOSIO_API_KEY=...
```

The `composio_user_prefix` is set in `master_agent.py` (default: `"hackeurope26"`). The full user ID is `{prefix}_{client_id}`.

---

## Files

| File | What |
|------|------|
| `agents/src/agents/integrations/composio_client.py` | `ComposioIntegration` — entity management, OAuth flow |
| `agents/src/agents/tools/hybrid_executor.py` | `HybridToolExecutor` — merges Composio + custom tools |
| `agents/src/agents/master_agent.py:30-67` | `ComposioIntegration` init, explorer executor building |
| `convex/schema.ts:22-24` | `composioEntityId` field on `data_sources` |
