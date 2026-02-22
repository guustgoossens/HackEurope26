from dataclasses import dataclass
from typing import Any


@dataclass
class ToolDefinition:
    name: str
    description: str
    parameters: dict[str, Any]


@dataclass
class ToolCall:
    id: str
    name: str
    input: dict[str, Any]


@dataclass
class ToolResult:
    tool_call_id: str
    content: str
    is_error: bool = False


def get_tool_schema(tool: ToolDefinition) -> dict:
    """Convert to Anthropic tool format."""
    return {
        "name": tool.name,
        "description": tool.description,
        "input_schema": {
            "type": "object",
            "properties": tool.parameters.get("properties", {}),
            "required": tool.parameters.get("required", []),
        },
    }


# Explorer tools
EXPLORER_TOOLS = [
    ToolDefinition(
        name="list_gmail_messages",
        description="List Gmail messages matching a query",
        parameters={
            "properties": {
                "query": {"type": "string", "description": "Gmail search query"},
                "max_results": {"type": "integer", "description": "Max messages to return", "default": 20},
            },
            "required": ["query"],
        },
    ),
    ToolDefinition(
        name="list_drive_files",
        description="List files in Google Drive",
        parameters={
            "properties": {
                "folder_id": {"type": "string", "description": "Drive folder ID (optional)"},
                "mime_type": {"type": "string", "description": "Filter by MIME type (optional)"},
            },
            "required": [],
        },
    ),
    ToolDefinition(
        name="read_sheet",
        description="Read data from a Google Sheets spreadsheet",
        parameters={
            "properties": {
                "spreadsheet_id": {"type": "string", "description": "Spreadsheet ID"},
                "range": {"type": "string", "description": "Cell range (e.g. 'Sheet1!A1:D10')"},
            },
            "required": ["spreadsheet_id", "range"],
        },
    ),
    ToolDefinition(
        name="report_metrics",
        description="Report discovery metrics back to the master agent",
        parameters={
            "properties": {
                "email_count": {"type": "integer", "description": "Number of emails found"},
                "file_count": {"type": "integer", "description": "Number of files found"},
                "sheet_count": {"type": "integer", "description": "Number of spreadsheets found"},
                "folder_structure": {"type": "string", "description": "Summary of folder structure"},
                "summary": {"type": "string", "description": "Brief summary of findings"},
            },
            "required": ["summary"],
        },
    ),
    ToolDefinition(
        name="check_forum",
        description="Search the agent forum for relevant past experiences",
        parameters={
            "properties": {
                "query": {"type": "string", "description": "Full-text search query"},
                "source_type": {"type": "string", "description": "Filter by source (gmail, drive, sheets)"},
                "phase": {"type": "string", "description": "Filter by phase (explore, structure, verify, use)"},
                "file_type": {"type": "string", "description": "Filter by file type (spreadsheet, pdf, email, document)"},
            },
            "required": ["query"],
        },
    ),
    ToolDefinition(
        name="write_to_forum",
        description="Write a new entry to the agent forum sharing a discovery or solution",
        parameters={
            "properties": {
                "title": {"type": "string", "description": "Entry title"},
                "category": {"type": "string", "description": "Category (e.g. 'gmail', 'drive', 'sheets', 'general')"},
                "content": {"type": "string", "description": "Entry content"},
                "tags": {"type": "array", "items": {"type": "string"}, "description": "Tags"},
                "source_type": {"type": "string", "description": "Source type (gmail, drive, sheets)"},
                "phase": {"type": "string", "description": "Pipeline phase (explore, structure, verify, use)"},
                "file_type": {"type": "string", "description": "File type (spreadsheet, pdf, email, document)"},
            },
            "required": ["title", "category", "content"],
        },
    ),
]

# Structurer tools
STRUCTURER_TOOLS = [
    ToolDefinition(
        name="extract_content",
        description="Use Gemini to extract content from a file (PDF, image, spreadsheet)",
        parameters={
            "properties": {
                "file_id": {"type": "string", "description": "Google Drive file ID"},
                "extraction_prompt": {"type": "string", "description": "What to extract from the file"},
            },
            "required": ["file_id", "extraction_prompt"],
        },
    ),
    ToolDefinition(
        name="classify_relevance",
        description="Classify the relevance of extracted content to the knowledge base",
        parameters={
            "properties": {
                "content": {"type": "string", "description": "Content to classify"},
                "context": {"type": "string", "description": "Business context for relevance assessment"},
            },
            "required": ["content", "context"],
        },
    ),
    ToolDefinition(
        name="add_contradiction",
        description="Report a contradiction found between data sources",
        parameters={
            "properties": {
                "description": {"type": "string", "description": "Description of the contradiction"},
                "source_a": {"type": "string", "description": "First source reference"},
                "source_b": {"type": "string", "description": "Second source reference"},
                "value_a": {"type": "string", "description": "Value from source A"},
                "value_b": {"type": "string", "description": "Value from source B"},
            },
            "required": ["description", "source_a", "source_b", "value_a", "value_b"],
        },
    ),
    ToolDefinition(
        name="message_master",
        description="Send a message to the master agent with findings or questions",
        parameters={
            "properties": {
                "message": {"type": "string", "description": "Message to the master agent"},
            },
            "required": ["message"],
        },
    ),
    ToolDefinition(
        name="check_forum",
        description="Search the agent forum for relevant past experiences",
        parameters={
            "properties": {
                "query": {"type": "string", "description": "Full-text search query"},
                "source_type": {"type": "string", "description": "Filter by source (gmail, drive, sheets)"},
                "phase": {"type": "string", "description": "Filter by phase (explore, structure, verify, use)"},
                "file_type": {"type": "string", "description": "Filter by file type (spreadsheet, pdf, email, document)"},
            },
            "required": ["query"],
        },
    ),
    ToolDefinition(
        name="write_to_forum",
        description="Write to the agent forum",
        parameters={
            "properties": {
                "title": {"type": "string", "description": "Entry title"},
                "category": {"type": "string", "description": "Category"},
                "content": {"type": "string", "description": "Entry content"},
                "tags": {"type": "array", "items": {"type": "string"}, "description": "Tags"},
                "source_type": {"type": "string", "description": "Source type (gmail, drive, sheets)"},
                "phase": {"type": "string", "description": "Pipeline phase (explore, structure, verify, use)"},
                "file_type": {"type": "string", "description": "File type (spreadsheet, pdf, email, document)"},
            },
            "required": ["title", "category", "content"],
        },
    ),
]

# Master agent tools
MASTER_TOOLS = [
    ToolDefinition(
        name="define_knowledge_tree",
        description="Define the knowledge tree structure for a client",
        parameters={
            "properties": {
                "nodes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "type": {"type": "string", "enum": ["domain", "skill", "entry_group"]},
                            "parent_name": {"type": "string", "description": "Name of parent node, null for root"},
                            "readme": {"type": "string"},
                            "order": {"type": "integer"},
                        },
                        "required": ["name", "type", "order"],
                    },
                },
            },
            "required": ["nodes"],
        },
    ),
    ToolDefinition(
        name="generate_questionnaire",
        description="Generate a verification questionnaire from open contradictions",
        parameters={
            "properties": {
                "title": {"type": "string", "description": "Questionnaire title"},
                "questions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "text": {"type": "string"},
                            "options": {"type": "array", "items": {"type": "string"}},
                            "contradiction_id": {"type": "string"},
                        },
                        "required": ["text", "options"],
                    },
                },
            },
            "required": ["title", "questions"],
        },
    ),
    ToolDefinition(
        name="advance_phase",
        description="Advance the pipeline to the next phase",
        parameters={
            "properties": {
                "next_phase": {"type": "string", "enum": ["structure", "verify", "use"]},
                "reason": {"type": "string"},
            },
            "required": ["next_phase", "reason"],
        },
    ),
]

# Sandbox tools (available to explorer + structurer agents)
SANDBOX_TOOLS = [
    ToolDefinition(
        name="download_file",
        description="Download a file from Google Drive to the local sandbox workspace for processing",
        parameters={
            "properties": {
                "file_id": {"type": "string", "description": "Google Drive file ID"},
                "filename": {
                    "type": "string",
                    "description": "Filename to save as (optional, defaults to Drive filename)",
                },
            },
            "required": ["file_id"],
        },
    ),
    ToolDefinition(
        name="run_command",
        description=(
            "Execute any shell command in the sandbox workspace (full /bin/sh, pipes and redirects work). "
            "Use for file inspection, text extraction, format conversion, and local data processing. "
            "Examples: 'ls -la', 'grep -r keyword .', 'pdftotext file.pdf -', "
            "'python3 script.py', 'ffmpeg -i input.mp4 output.mp3', 'find . -name \"*.csv\"'. "
            "Only truly destructive commands (rm -rf /, curl | bash, etc.) are blocked. "
            "Do NOT use this to look for Google/OAuth credentials — use the Google Workspace tools directly."
        ),
        parameters={
            "properties": {
                "command": {"type": "string", "description": "Shell command to execute"},
                "timeout": {
                    "type": "integer",
                    "description": "Timeout in seconds (default 60, max 300)",
                    "default": 60,
                },
            },
            "required": ["command"],
        },
    ),
    ToolDefinition(
        name="read_local_file",
        description="Read a file from the sandbox workspace",
        parameters={
            "properties": {
                "filepath": {"type": "string", "description": "Path to the file (relative to workspace or absolute)"},
                "max_chars": {
                    "type": "integer",
                    "description": "Max characters to read (default 50000)",
                    "default": 50000,
                },
            },
            "required": ["filepath"],
        },
    ),
    ToolDefinition(
        name="list_workspace",
        description="List all files in the current sandbox workspace with sizes and MIME types",
        parameters={
            "properties": {},
            "required": [],
        },
    ),
    ToolDefinition(
        name="install_package",
        description="Install a Python package via uv for use in subsequent commands",
        parameters={
            "properties": {
                "package": {"type": "string", "description": "Package name (e.g. 'pandas', 'whisper')"},
            },
            "required": ["package"],
        },
    ),
]

# Knowledge writer tools
KNOWLEDGE_WRITER_TOOLS = [
    ToolDefinition(
        name="write_knowledge_entry",
        description="Write a knowledge entry to the knowledge base",
        parameters={
            "properties": {
                "tree_node_id": {"type": "string", "description": "ID of the tree node to attach to"},
                "title": {"type": "string"},
                "content": {"type": "string"},
                "source_ref": {"type": "string"},
                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            },
            "required": ["tree_node_id", "title", "content", "confidence"],
        },
    ),
    ToolDefinition(
        name="flag_contradiction",
        description="Flag a new contradiction found during knowledge writing",
        parameters={
            "properties": {
                "description": {"type": "string"},
                "source_a": {"type": "string"},
                "source_b": {"type": "string"},
                "value_a": {"type": "string"},
                "value_b": {"type": "string"},
            },
            "required": ["description", "source_a", "source_b", "value_a", "value_b"],
        },
    ),
]
