import logging

logger = logging.getLogger(__name__)

GOOGLE_TOOL_PREFIXES = ("GMAIL_", "GOOGLEDRIVE_", "GOOGLESHEETS_")
GOOGLE_TOOLKITS = ["gmail", "googledrive", "googlesheets"]


class ComposioIntegration:
    """Wrapper around Composio SDK for Google Workspace tools."""

    def __init__(self, api_key: str, auth_config_ids: dict[str, str] | None = None):
        from composio import Composio
        from composio_anthropic import AnthropicProvider

        self.provider = AnthropicProvider()
        self.composio = Composio(api_key=api_key, provider=self.provider)
        # Map toolkit slug -> auth config id, e.g. {"gmail": "ac_XpF8cor_8g5S"}
        self.auth_config_ids = auth_config_ids or {}

    def get_google_tools(self, user_id: str) -> list[dict]:
        """Get Composio tool schemas for Google Workspace."""
        try:
            session = self.composio.create(
                user_id=user_id,
                toolkits=GOOGLE_TOOLKITS,
                auth_configs=self.auth_config_ids if self.auth_config_ids else None,
            )
            tools = session.tools()
            logger.info(f"Got {len(tools)} Google tools from Composio")
            return tools
        except Exception as e:
            logger.error(f"Failed to get Composio Google tools: {e}")
            return []

    def handle_tool_calls(self, user_id: str, response) -> list:
        """Let Composio handle tool calls from Claude's response."""
        try:
            return self.provider.handle_tool_calls(user_id=user_id, response=response)
        except Exception as e:
            logger.error(f"Composio tool call handling failed: {e}")
            return []

    @staticmethod
    def is_composio_tool(tool_name: str) -> bool:
        """Check if a tool name belongs to Composio (Google Workspace)."""
        return any(tool_name.upper().startswith(p) for p in GOOGLE_TOOL_PREFIXES)
