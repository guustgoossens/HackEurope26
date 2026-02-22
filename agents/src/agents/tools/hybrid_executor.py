import logging

from .definitions import ToolCall, ToolResult
from .executor import ToolExecutor
from ..integrations.composio_client import ComposioIntegration

logger = logging.getLogger(__name__)


class HybridToolExecutor:
    """Dispatches tool calls to either Composio or custom ToolExecutor."""

    def __init__(
        self,
        custom_executor: ToolExecutor,
        composio: ComposioIntegration | None = None,
        composio_user_id: str = "",
    ):
        self.custom_executor = custom_executor
        self.composio = composio
        self.composio_user_id = composio_user_id

    async def execute(self, tool_call: ToolCall) -> ToolResult:
        """Route tool call to appropriate executor."""
        if self.composio and ComposioIntegration.is_composio_tool(tool_call.name):
            return await self._execute_composio(tool_call)
        return await self.custom_executor.execute(tool_call)

    async def _execute_composio(self, tool_call: ToolCall) -> ToolResult:
        """Execute a Composio tool call."""
        try:
            logger.info(f"Executing Composio tool: {tool_call.name}")
            content = self.composio.execute_tool(
                tool_call.name, tool_call.input, self.composio_user_id
            )
            return ToolResult(tool_call_id=tool_call.id, content=content)
        except Exception as e:
            logger.error(f"Composio tool {tool_call.name} failed: {e}")
            return ToolResult(
                tool_call_id=tool_call.id,
                content=f"Composio tool error: {e}",
                is_error=True,
            )

    def get_tools_for_source(self, source_type: str, custom_tool_schemas: list[dict]) -> list[dict]:
        """Get tool schemas for a specific source type: matching Composio tools + custom tools."""
        if not self.composio:
            return custom_tool_schemas
        composio_tools = self.composio.get_tools_for_source(self.composio_user_id, source_type)
        return composio_tools + custom_tool_schemas
