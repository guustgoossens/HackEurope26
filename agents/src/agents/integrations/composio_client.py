import logging

logger = logging.getLogger(__name__)

GOOGLE_TOOL_PREFIXES = ("GMAIL_", "GOOGLEDRIVE_", "GOOGLESHEETS_")

# Maps data source type → Composio toolkit slugs (some sources need cross-toolkit discovery)
SOURCE_TOOLKITS: dict[str, list[str]] = {
    "gmail": ["gmail"],
    "drive": ["googledrive"],
    "sheets": ["googlesheets", "googledrive"],
}

MAX_RESULT_CHARS = 30_000


class ComposioIntegration:
    """Wrapper around Composio SDK for Google Workspace tools."""

    def __init__(self, api_key: str, auth_config_ids: dict[str, str] | None = None):
        from composio import Composio
        from composio_anthropic import AnthropicProvider

        self.provider = AnthropicProvider()
        self.composio = Composio(api_key=api_key, provider=self.provider)
        # Kept for potential future use with composio.tools.execute(connected_account_id=...)
        self.auth_config_ids = auth_config_ids or {}
        # Note: Composio SDK resolves auth via user_id at connection time.
        # tools.get() and execute_tool_call() do not accept auth_config_id.

    def get_tools_for_source(self, user_id: str, source_type: str) -> list[dict]:
        """Get Composio tool schemas for a specific data source type."""
        toolkits = SOURCE_TOOLKITS.get(source_type)
        if not toolkits:
            logger.warning(f"No Composio toolkit mapped for source_type '{source_type}'")
            return []
        try:
            tools = self.composio.tools.get(user_id=user_id, toolkits=toolkits)
            tool_names = [t.get("name", "?") for t in tools]
            logger.info(f"Got {len(tools)} {source_type} tools from Composio (toolkits={toolkits}): {tool_names}")
            return tools
        except Exception as e:
            logger.error(f"Failed to get Composio tools for {source_type}: {e}")
            return []

    def execute_tool(self, name: str, args: dict, user_id: str) -> str:
        """Execute a single Composio tool and return its result as a string."""
        import uuid
        from anthropic.types import ToolUseBlock

        tool_use = ToolUseBlock(
            id=f"toolu_{uuid.uuid4().hex[:24]}",
            type="tool_use",
            name=name,
            input=args,
        )
        result = self.provider.execute_tool_call(user_id=user_id, tool_call=tool_use)
        # SDK may return a ToolExecutionResponse object or a plain dict
        if isinstance(result, dict):
            successful = result.get("successful", False)
            data = result.get("data")
            error = result.get("error")
        else:
            successful = result.successful
            data = result.data
            error = result.error
        logger.info(f"Composio {name} result: successful={successful}, data={str(data)[:200]}")
        if successful:
            text = str(data) if data is not None else ""
            if len(text) > MAX_RESULT_CHARS:
                original_len = len(text)
                text = text[:MAX_RESULT_CHARS] + f"\n... (truncated from {original_len} chars)"
                logger.warning(f"Composio {name} result truncated: {original_len} -> {MAX_RESULT_CHARS}")
            return text
        return f"Composio error: {error}"

    @staticmethod
    def is_composio_tool(tool_name: str) -> bool:
        """Check if a tool name belongs to Composio (Google Workspace)."""
        return any(tool_name.upper().startswith(p) for p in GOOGLE_TOOL_PREFIXES)
