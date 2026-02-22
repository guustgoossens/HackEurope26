from typing import Protocol, Any


class LLMProvider(Protocol):
    async def complete(self, prompt: str, system: str = "") -> str: ...
    async def complete_messages(self, messages: list[dict], system: str = "") -> str: ...


class ToolCapableLLM(Protocol):
    async def complete_with_tools(
        self, prompt: str, tools: list[dict], system: str = ""
    ) -> tuple[str, list[dict]]: ...
    async def complete_with_tools_messages(
        self, messages: list[dict], tools: list[dict], system: str = ""
    ) -> tuple[str, list[dict]]: ...
