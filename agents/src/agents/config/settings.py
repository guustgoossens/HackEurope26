from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str
    GEMINI_API_KEY: str
    GOOGLE_CREDENTIALS_JSON: str = "./credentials.json"
    CONVEX_SITE_URL: str
    CONVEX_AGENT_TOKEN: str
    COMPOSIO_API_KEY: str = ""
    COMPOSIO_USER_PREFIX: str = "hackeurope26"
    COMPOSIO_GMAIL_AUTH_CONFIG_ID: str = ""
    COMPOSIO_DRIVE_AUTH_CONFIG_ID: str = ""
    COMPOSIO_SHEETS_AUTH_CONFIG_ID: str = ""
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"
    GEMINI_MODEL: str = "gemini-2.5-pro"
    MAX_AGENT_TURNS: int = 20
    AGENT_AUTH_TOKEN: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}
