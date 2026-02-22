# Pattern 1: Capabilities-Focused Prompts

## Source

[ClawdBot](https://github.com/PicoCreator/ClawdBot) and its successor [OpenClaw](https://github.com/PicoCreator/OpenClaw).

The famous example: ClawdBot discovered `ffmpeg` on the system, found an OpenAI API key in the environment, and used `curl` to call Whisper for voice transcription — entirely unprompted. Nobody told it to. Nobody told it *not* to either. That resourcefulness came from not having a wall of restrictions.

---

## Problem

The original explorer system prompt was written defensively:

```python
# OLD (removed from git history):
"You do NOT need to:\n"
"- Install any packages (no pip, no gspread, no google-auth)\n"
"- Write Python scripts to authenticate with Google APIs\n"
"- Search for credential files or environment variables\n"
"- Set up OAuth flows or service accounts\n"
...
"## On Failure\n"
"If a tool call returns an error, do NOT retry the same approach..."
```

This style creates two problems:
1. **Kills resourcefulness**: the agent learns "when in doubt, don't". A tool it wasn't explicitly told about won't be tried.
2. **Instruction inversion**: in practice, observed agents refusing to try valid approaches because the task felt adjacent to something on the "do NOT" list.

The prompt change was both proactive (ClawdBot philosophy applied upfront) and reactive (real stuck cases observed where agents skipped valid tools).

---

## Implementation

The new prompt is environment-descriptive, not rule-based:

```python
# explorer.py:74-89
return (
    f'You are an explorer agent investigating a {self.source_type} data source '
    f'labeled "{self.source_label}".\n\n'

    f"## Goal\n"
    f"Discover what data is available, understand its structure, report findings via report_metrics.\n\n"

    f"## Environment\n"
    f"auth: {self._auth_mode}{workspace_line} | sandbox: allowlisted commands\n"
    f"Google Workspace access is pre-configured — the Google tools below have authentication handled.\n\n"

    f"## Available Tools\n"
    f"{tool_section}"

    f"When done, call report_metrics with a summary of what you found."
)
```

Key elements:

**The runtime line** (`auth: composio | workspace: /tmp/... | sandbox: allowlisted commands`) — borrowed directly from OpenClaw's system prompt style. One dense line gives the agent environment awareness: auth is handled, a workspace exists, commands are available. The agent knows what it has without being told what it doesn't have.

**Tool categorization** (lines 42-70): tools are grouped into `Google Workspace (auth pre-configured)`, `Sandbox (local file processing)`, and `Utility`. This mirrors OpenClaw's approach of describing capabilities by category.

**Sandbox restoration** (`master_agent.py:57-67`): sandbox tools (`download_file`, `run_command`, `read_local_file`, `list_workspace`, `install_package`) are available to explorer agents. They can download a Drive file and run `pdftotext` on it if they find a creative reason to.

---

## The Tension with Pre-Configured Integrations

Capability-focused prompts work well for discovery. But when a specific integration exists (Composio for Google Workspace), the same agent resourcefulness can work against you: the agent sees `run_command` and `install_package`, and tries to DIY Google auth instead of using the pre-connected Composio tools.

**Observed failure mode** (Feb 2026 debugging):
```
Agent tries: env | grep -i google  (blocked by sandbox)
Agent tries: pip install google-api-python-client
Agent runs: python script looking for token.json → "No valid credentials found"
Agent tries: pip install google-auth google-auth-oauthlib ...
```

The system prompt says "Google Workspace access is pre-configured" — but the agent doesn't trust a generic claim when it can *see* tools to do it manually.

**Implication**: trust statements must be specific when a pre-configured integration exists. Generic: "authentication is handled". Specific: "call `GMAIL_LIST_EMAILS` directly — do not install google packages, do not look for token.json, authentication is managed by Composio".

This is the boundary of the capabilities-focused principle: **describe what's available, but when a specific path is pre-configured, name it explicitly**.

---

## Files

| File | Lines | What |
|------|-------|------|
| `agents/src/agents/sub_agents/explorer.py` | 40–89 | `_build_system_prompt()` — runtime line, tool section |
| `agents/src/agents/sub_agents/structurer.py` | 46–78 | Same pattern for structurer |
| `agents/src/agents/master_agent.py` | 48–67 | Sandbox tool registration for explorer |
