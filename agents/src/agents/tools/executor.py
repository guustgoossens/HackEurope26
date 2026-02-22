import logging
from typing import Any, Callable, Awaitable

from .definitions import ToolCall, ToolResult

logger = logging.getLogger(__name__)


class ToolExecutor:
    """Maps tool names to async handler functions."""

    def __init__(self):
        self._handlers: dict[str, Callable[..., Awaitable[str]]] = {}

    def register(self, name: str, handler: Callable[..., Awaitable[str]]):
        self._handlers[name] = handler

    async def execute(self, tool_call: ToolCall) -> ToolResult:
        handler = self._handlers.get(tool_call.name)
        if not handler:
            return ToolResult(
                tool_call_id=tool_call.id,
                content=f"Unknown tool: {tool_call.name}",
                is_error=True,
            )
        try:
            result = await handler(**tool_call.input)
            return ToolResult(tool_call_id=tool_call.id, content=str(result))
        except Exception as e:
            logger.error(f"Tool {tool_call.name} failed: {e}")
            return ToolResult(
                tool_call_id=tool_call.id,
                content=f"Tool error: {e}",
                is_error=True,
            )
