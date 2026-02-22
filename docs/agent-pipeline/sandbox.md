# Sandbox Infrastructure

The sandbox gives explorer and structurer agents a local file processing workspace — a temp directory with allowlisted shell commands.

---

## Why Explorers Have It

Capability-focused prompt philosophy (see [patterns/01](../patterns/01-capabilities-focused-prompts.md)): the agent should be able to find creative uses for local processing tools. If it downloads a Drive PDF and decides to run `pdftotext` on it, that's resourceful behavior we want to allow.

Sandbox tools were deliberately restored to explorer agents in `master_agent.py:57-67` even when Composio is active — the sandbox is for *processing* downloaded files, separate from the Google Workspace authentication concern.

---

## Available Tools

| Tool | Purpose |
|------|---------|
| `download_file` | Download a Google Drive file to the workspace by file ID |
| `run_command` | Execute an allowlisted shell command |
| `read_local_file` | Read a file from the workspace (max 50,000 chars by default) |
| `list_workspace` | List all files in workspace with sizes and MIME types |
| `install_package` | Install a Python package via `uv pip install` |

---

## Allowlisted Commands (`run_command`)

```
ffmpeg, pdftotext, tesseract, python, uv pip install,
file, convert, wc, head, tail, cat, ls, mkdir, cp, mv
```

Not allowlisted: `curl`, `wget`, `env`, `grep` over environment variables, network calls. The sandbox blocks commands that try to discover credentials or make external network calls outside the approved tool set.

---

## Implementation

```python
# agents/src/agents/sandbox.py
class SandboxFileManager:
    """Manages the temp workspace directory lifecycle."""

class CommandExecutor:
    """Executes allowlisted commands; returns stdout/stderr."""
```

The `MasterAgent` initializes both at startup:
```python
self.file_manager = SandboxFileManager()
self.command_executor = CommandExecutor()
self.workspace: str | None = None  # set when a workspace is created
```

The workspace path is passed to `ExplorerAgent` as `workspace_path`, which includes it in the runtime line:
```
auth: composio | workspace: /tmp/hackeurope_abc123 | sandbox: allowlisted commands
```

---

## Typical Creative Use Cases

- Download a PDF from Drive → `pdftotext` → `read_local_file` to extract text
- Download a spreadsheet → `python` script to parse → read output
- Download a scanned image → `tesseract` → OCR text extraction
- Run `file` on an unknown-format Drive export to determine MIME type

These are the ClawdBot-style discoveries the sandbox enables. The Composio Google tools handle *listing and referencing* files; the sandbox handles *downloading and processing* them locally.
