from .adapters import AnthropicAdapter, GeminiAdapter


def create_llm_providers(settings) -> tuple[AnthropicAdapter, GeminiAdapter]:
    return (
        AnthropicAdapter(api_key=settings.ANTHROPIC_API_KEY, model=settings.CLAUDE_MODEL),
        GeminiAdapter(api_key=settings.GEMINI_API_KEY, model=settings.GEMINI_MODEL),
    )
