import anthropic
import google.genai as genai
from google.genai import types as genai_types


class AnthropicAdapter:
    """Adapter for Anthropic Claude API, implementing LLMProvider and ToolCapableLLM."""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.client = anthropic.AsyncAnthropic(api_key=api_key)
        self.model = model

    async def complete(self, prompt: str, system: str = "") -> str:
        kwargs: dict = {
            "model": self.model,
            "max_tokens": 4096,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system:
            kwargs["system"] = system
        response = await self.client.messages.create(**kwargs)
        return self._extract_text(response)

    async def complete_messages(self, messages: list[dict], system: str = "") -> str:
        kwargs: dict = {
            "model": self.model,
            "max_tokens": 4096,
            "messages": messages,
        }
        if system:
            kwargs["system"] = system
        response = await self.client.messages.create(**kwargs)
        return self._extract_text(response)

    async def complete_with_tools(
        self, prompt: str, tools: list[dict], system: str = ""
    ) -> tuple[str, list[dict]]:
        kwargs: dict = {
            "model": self.model,
            "max_tokens": 4096,
            "messages": [{"role": "user", "content": prompt}],
            "tools": tools,
        }
        if system:
            kwargs["system"] = system
        response = await self.client.messages.create(**kwargs)
        return self._extract_text(response), self._extract_tool_calls(response)

    async def complete_with_tools_messages(
        self, messages: list[dict], tools: list[dict], system: str = ""
    ) -> tuple[str, list[dict]]:
        kwargs: dict = {
            "model": self.model,
            "max_tokens": 4096,
            "messages": messages,
            "tools": tools,
        }
        if system:
            kwargs["system"] = system
        response = await self.client.messages.create(**kwargs)
        return self._extract_text(response), self._extract_tool_calls(response)

    @staticmethod
    def _extract_text(response) -> str:
        parts = []
        for block in response.content:
            if block.type == "text":
                parts.append(block.text)
        return "\n".join(parts)

    @staticmethod
    def _extract_tool_calls(response) -> list[dict]:
        calls = []
        for block in response.content:
            if block.type == "tool_use":
                calls.append({"id": block.id, "name": block.name, "input": block.input})
        return calls


class GeminiAdapter:
    """Adapter for Google Gemini API, implementing LLMProvider."""

    def __init__(self, api_key: str, model: str = "gemini-2.5-pro"):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model

    async def complete(self, prompt: str, system: str = "") -> str:
        config = genai_types.GenerateContentConfig(system_instruction=system) if system else None
        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=config,
        )
        return response.text

    async def complete_messages(self, messages: list[dict], system: str = "") -> str:
        # Convert messages to Gemini Content objects
        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            content = msg.get("content", "")
            if isinstance(content, list):
                text_parts = [c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"]
                content = "\n".join(text_parts)
            contents.append(genai_types.Content(role=role, parts=[genai_types.Part(text=content)]))

        config = genai_types.GenerateContentConfig(system_instruction=system) if system else None
        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=contents,
            config=config,
        )
        return response.text

    async def extract_multimodal(self, file_bytes: bytes, mime_type: str, prompt: str) -> str:
        """Process PDFs, images, and other files using Gemini's multimodal capabilities."""
        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=[
                genai_types.Part(inline_data=genai_types.Blob(mime_type=mime_type, data=file_bytes)),
                prompt,
            ],
        )
        return response.text
