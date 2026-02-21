import anthropic
import google.generativeai as genai


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
        genai.configure(api_key=api_key)
        self.model_name = model

    async def complete(self, prompt: str, system: str = "") -> str:
        model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=system if system else None,
        )
        response = await model.generate_content_async(prompt)
        return response.text

    async def complete_messages(self, messages: list[dict], system: str = "") -> str:
        model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=system if system else None,
        )
        # Convert messages to Gemini format
        history = []
        last_content = ""
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            content = msg.get("content", "")
            if isinstance(content, list):
                # Extract text from content blocks
                text_parts = [c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"]
                content = "\n".join(text_parts)
            if msg == messages[-1]:
                last_content = content
            else:
                history.append({"role": role, "parts": [content]})

        chat = model.start_chat(history=history)
        response = await chat.send_message_async(last_content)
        return response.text

    async def extract_multimodal(self, file_bytes: bytes, mime_type: str, prompt: str) -> str:
        """Process PDFs, images, and other files using Gemini's multimodal capabilities."""
        model = genai.GenerativeModel(model_name=self.model_name)
        response = await model.generate_content_async(
            [
                {"mime_type": mime_type, "data": file_bytes},
                prompt,
            ]
        )
        return response.text
