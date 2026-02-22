# Tool Definitions

All tool groups used by the agent pipeline. Defined in `agents/src/agents/tools/definitions.py`.

---

## Explorer Tools

Used by `ExplorerAgent`. Forum tools include metadata filter fields added Feb 2026.

| Tool | Required Params | Optional Params | Notes |
|------|-----------------|-----------------|-------|
| `list_gmail_messages` | `query` | `max_results` (default 20) | Gmail search syntax |
| `list_drive_files` | — | `folder_id`, `mime_type` | Returns file list |
| `read_sheet` | `spreadsheet_id`, `range` | — | Range e.g. `Sheet1!A1:D10` |
| `report_metrics` | `summary` | `email_count`, `file_count`, `sheet_count`, `folder_structure` | **Intercepted** — captured locally + persisted to Convex |
| `check_forum` | `query` | `source_type`, `phase`, `file_type` | Full-text search with filters |
| `write_to_forum` | `title`, `category`, `content` | `tags`, `source_type`, `phase`, `file_type` | Shares discoveries for future agents |

---

## Structurer Tools

Used by `StructurerAgent`.

| Tool | Required Params | Optional Params | Notes |
|------|-----------------|-----------------|-------|
| `extract_content` | `file_id`, `extraction_prompt` | — | Gemini multimodal extraction |
| `classify_relevance` | `content`, `context` | — | Claude-based classification |
| `add_contradiction` | `description`, `source_a`, `source_b`, `value_a`, `value_b` | — | **Intercepted** — stored in state + persisted to Convex |
| `message_master` | `message` | — | **Intercepted** — stored in SubAgentReport |
| `check_forum` | `query` | `source_type`, `phase`, `file_type` | Same as explorer |
| `write_to_forum` | `title`, `category`, `content` | `tags`, `source_type`, `phase`, `file_type` | Same as explorer |

---

## Master Agent Tools

Used by `MasterAgent` directly in the structure and verify phases.

| Tool | Required Params | Optional Params | Notes |
|------|-----------------|-----------------|-------|
| `define_knowledge_tree` | `nodes[]` | — | Each node: `name`, `type` (domain/skill/entry_group), `order`, optional `parent_name` + `readme` |
| `generate_questionnaire` | `title`, `questions[]` | — | Each question: `text`, `options[]`, optional `contradiction_id` |
| `advance_phase` | `next_phase`, `reason` | — | Enum: `structure`, `verify`, `use` |

---

## Sandbox Tools

Available to ExplorerAgent and StructurerAgent when a workspace exists.

| Tool | Required Params | Optional Params | Notes |
|------|-----------------|-----------------|-------|
| `download_file` | `file_id` | `filename` | Downloads from Drive to workspace |
| `run_command` | `command` | `timeout` (default 60s, max 300s) | Allowlisted commands only |
| `read_local_file` | `filepath` | `max_chars` (default 50,000) | Reads from workspace |
| `list_workspace` | — | — | Lists all files with sizes + MIME types |
| `install_package` | `package` | — | `uv pip install` |

Allowlisted for `run_command`: `ffmpeg`, `pdftotext`, `tesseract`, `python`, `uv pip install`, `file`, `convert`, `wc`, `head`, `tail`, `cat`, `ls`, `mkdir`, `cp`, `mv`.

---

## Knowledge Writer Tools

Used by `KnowledgeWriterAgent`.

| Tool | Required Params | Optional Params | Notes |
|------|-----------------|-----------------|-------|
| `write_knowledge_entry` | `tree_node_id`, `title`, `content`, `confidence` (0–1) | `source_ref` | Populates leaf nodes |
| `flag_contradiction` | `description`, `source_a`, `source_b`, `value_a`, `value_b` | — | Flags residual contradictions found during writing |

---

## Intercepted Tools

Three tools are intercepted at the agent level before/after executor invocation:

| Tool | Where Intercepted | Why |
|------|-------------------|-----|
| `report_metrics` | ExplorerAgent | Capture into `SubAgentReport.metrics` locally while also emitting to Convex |
| `add_contradiction` | StructurerAgent | Store in `state.open_contradictions` locally while also writing to Convex |
| `message_master` | StructurerAgent | Store in `SubAgentReport.messages` — no executor needed, just local accumulation |

---

## Forum Filter Fields

The `check_forum` and `write_to_forum` tools accept three metadata filter fields:

| Field | Values | Use Case |
|-------|--------|----------|
| `source_type` | `gmail`, `drive`, `sheets` | A structurer querying Gmail-specific guides |
| `phase` | `explore`, `structure`, `verify`, `use` | A structurer querying explore-phase discoveries |
| `file_type` | `spreadsheet`, `pdf`, `email`, `document` | Targeting format-specific extraction tips |

These map directly to the `forum_entries` table's `searchIndex` filterFields. See [patterns/03-agent-forum.md](../patterns/03-agent-forum.md) for rationale.
