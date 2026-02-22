import asyncio
import argparse
import logging

from .config.settings import Settings
from .llm.factory import create_llm_providers
from .storage.convex_client import ConvexClient
from .integrations.google_workspace import GoogleWorkspaceClient
from .integrations.composio_client import ComposioIntegration
from .master_agent import MasterAgent

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s"
)
logger = logging.getLogger(__name__)


async def main(client_id: str):
    settings = Settings()
    claude, gemini = create_llm_providers(settings)

    # Initialize Composio if API key is set, otherwise fall back to Google service account
    composio: ComposioIntegration | None = None
    google: GoogleWorkspaceClient | None = None
    if settings.COMPOSIO_API_KEY:
        logger.info("Using Composio for Google Workspace integration")
        auth_configs = {}
        if settings.COMPOSIO_GMAIL_AUTH_CONFIG_ID:
            auth_configs["gmail"] = settings.COMPOSIO_GMAIL_AUTH_CONFIG_ID
        if settings.COMPOSIO_DRIVE_AUTH_CONFIG_ID:
            auth_configs["googledrive"] = settings.COMPOSIO_DRIVE_AUTH_CONFIG_ID
        if settings.COMPOSIO_SHEETS_AUTH_CONFIG_ID:
            auth_configs["googlesheets"] = settings.COMPOSIO_SHEETS_AUTH_CONFIG_ID
        composio = ComposioIntegration(settings.COMPOSIO_API_KEY, auth_config_ids=auth_configs)
    else:
        logger.info("Composio API key not set, using GoogleWorkspaceClient fallback")
        google = GoogleWorkspaceClient(settings.GOOGLE_CREDENTIALS_JSON)

    async with ConvexClient(
        settings.CONVEX_SITE_URL,
        settings.CONVEX_AGENT_TOKEN,
        timeout=settings.CONVEX_TIMEOUT,
        max_retries=settings.CONVEX_MAX_RETRIES,
    ) as convex:
        # Try to fetch actual data sources from Convex
        data_sources = await convex.get_data_sources(client_id)

        if not data_sources:
            # Fallback to defaults for hackathon demo
            logger.info("No data sources from Convex, using defaults")
            data_sources = [
                {"_id": "placeholder_gmail", "type": "gmail", "label": "Company Gmail"},
                {"_id": "placeholder_drive", "type": "drive", "label": "Company Drive"},
            ]
        else:
            logger.info(f"Fetched {len(data_sources)} data sources from Convex")

        master = MasterAgent(
            claude=claude,
            gemini=gemini,
            convex=convex,
            google=google,
            client_id=client_id,
            composio=composio,
            composio_user_prefix=settings.COMPOSIO_USER_PREFIX,
            verify_timeout=settings.VERIFY_TIMEOUT,
        )

        await master.run(data_sources)


def cli():
    parser = argparse.ArgumentParser(description="HackEurope26 Agent Pipeline")
    parser.add_argument(
        "--client-id", required=True, help="Convex client document ID"
    )
    args = parser.parse_args()

    asyncio.run(main(args.client_id))


if __name__ == "__main__":
    cli()
