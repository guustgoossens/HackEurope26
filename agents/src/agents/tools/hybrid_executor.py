import logging
from typing import Any

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
            results = self.composio.handle_tool_calls(
                user_id=self.composio_user_id,
                response=_make_fake_response(tool_call),
            )
            content = str(results[0]) if results else "No result from Composio"
            return ToolResult(tool_call_id=tool_call.id, content=content)
        except Exception as e:
            logger.error(f"Composio tool {tool_call.name} failed: {e}")
            return ToolResult(
                tool_call_id=tool_call.id,
                content=f"Composio tool error: {e}",
                is_error=True,
            )

    def get_merged_tools(self, custom_tool_schemas: list[dict]) -> list[dict]:
        """Merge Composio Google tool schemas with custom tool schemas."""
        if not self.composio:
            return custom_tool_schemas

        composio_tools = self.composio.get_google_tools(self.composio_user_id)
        return composio_tools + custom_tool_schemas


def _make_fake_response(tool_call: ToolCall) -> Any:
    """Create a minimal object that Composio's handler expects."""

    class FakeToolUse:
        def __init__(self, tc: ToolCall):
            self.id = tc.id
            self.name = tc.name
            self.input = tc.input
            self.type = "tool_use"

    class FakeContentBlock:
        def __init__(self, tc: ToolCall):
            self.content = [FakeToolUse(tc)]
            self.stop_reason = "tool_use"

    return FakeContentBlock(tool_call)
