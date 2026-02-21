import logging

from ..storage.convex_client import ConvexClient

logger = logging.getLogger(__name__)


class ForumClient:
    def __init__(self, convex: ConvexClient):
        self._convex = convex

    async def search(self, query: str) -> list[dict]:
        return await self._convex.search_forum(query)

    async def write(
        self,
        title: str,
        category: str,
        content: str,
        author_agent: str,
        tags: list[str] | None = None,
    ) -> dict:
        return await self._convex.create_forum_entry(
            title=title,
            category=category,
            content=content,
            author_agent=author_agent,
            tags=tags or [],
        )
