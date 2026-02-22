import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class ConvexClient:
    """HTTP client for communicating with Convex backend endpoints."""

    def __init__(self, base_url: str, auth_token: str):
        self._base_url = base_url.rstrip("/")
        self._auth_token = auth_token
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self):
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers={
                "Authorization": f"Bearer {self._auth_token}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._client:
            await self._client.aclose()
            self._client = None

    async def _post(self, path: str, payload: dict) -> dict | None:
        try:
            resp = await self._client.post(path, json=payload)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.warning(f"Convex POST {path} failed: {e}")
            return None

    async def _get(self, path: str) -> dict | None:
        try:
            resp = await self._client.get(path)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.warning(f"Convex GET {path} failed: {e}")
            return None

    # ── Event logging ──────────────────────────────────────────────────

    async def emit_event(
        self,
        client_id: str,
        agent_name: str,
        event_type: str,
        message: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict | None:
        return await self._post(
            "/api/agent/event",
            {
                "clientId": client_id,
                "agentName": agent_name,
                "eventType": event_type,
                "message": message,
                "metadata": metadata or {},
            },
        )

    # ── Contradictions ─────────────────────────────────────────────────

    async def add_contradiction(
        self,
        client_id: str,
        desc: str,
        source_a: str,
        source_b: str,
        value_a: str,
        value_b: str,
    ) -> dict | None:
        return await self._post(
            "/api/agent/contradiction",
            {
                "clientId": client_id,
                "description": desc,
                "sourceA": source_a,
                "sourceB": source_b,
                "valueA": value_a,
                "valueB": value_b,
            },
        )

    # ── Exploration ────────────────────────────────────────────────────

    async def upsert_exploration(
        self,
        client_id: str,
        data_source_id: str,
        metrics: dict,
        status: str,
    ) -> dict | None:
        return await self._post(
            "/api/agent/exploration",
            {
                "clientId": client_id,
                "dataSourceId": data_source_id,
                "metrics": metrics,
                "status": status,
            },
        )

    # ── Knowledge tree ─────────────────────────────────────────────────

    async def create_knowledge_node(
        self,
        client_id: str,
        parent_id: str | None,
        name: str,
        type: str,
        readme: str,
        order: int,
    ) -> dict | None:
        return await self._post(
            "/api/agent/knowledge/node",
            {
                "clientId": client_id,
                "parentId": parent_id,
                "name": name,
                "type": type,
                "readme": readme,
                "order": order,
            },
        )

    async def create_knowledge_entry(
        self,
        client_id: str,
        tree_node_id: str,
        title: str,
        content: str,
        source_ref: str,
        confidence: float,
        verified: bool = False,
    ) -> dict | None:
        return await self._post(
            "/api/agent/knowledge/entry",
            {
                "clientId": client_id,
                "treeNodeId": tree_node_id,
                "title": title,
                "content": content,
                "sourceRef": source_ref,
                "confidence": confidence,
                "verified": verified,
            },
        )

    # ── Agent forum ────────────────────────────────────────────────────

    async def search_forum(self, query: str) -> list[dict]:
        result = await self._post("/api/agent/forum/search", {"query": query})
        if isinstance(result, dict):
            return result.get("results", [])
        return result if isinstance(result, list) else []

    async def create_forum_entry(
        self,
        title: str,
        category: str,
        content: str,
        author_agent: str,
        tags: list[str],
    ) -> dict | None:
        return await self._post(
            "/api/agent/forum/create",
            {
                "title": title,
                "category": category,
                "content": content,
                "authorAgent": author_agent,
                "tags": tags,
            },
        )

    # ── Questionnaire ──────────────────────────────────────────────────

    async def create_questionnaire(
        self,
        client_id: str,
        title: str,
        questions: list[dict],
    ) -> dict | None:
        return await self._post(
            "/api/agent/questionnaire/create",
            {
                "clientId": client_id,
                "title": title,
                "questions": questions,
            },
        )

    # ── Questionnaire responses ────────────────────────────────────

    async def get_questionnaire_responses(
        self, client_id: str, questionnaire_id: str
    ) -> list[dict]:
        result = await self._get(
            f"/api/agent/questionnaire/responses?clientId={client_id}&questionnaireId={questionnaire_id}"
        )
        if isinstance(result, dict):
            return result.get("responses", [])
        return result if isinstance(result, list) else []

    # ── Data sources ────────────────────────────────────────────────

    async def get_data_sources(self, client_id: str) -> list[dict]:
        result = await self._get(
            f"/api/agent/data-sources?clientId={client_id}"
        )
        if isinstance(result, dict):
            return result.get("dataSources", [])
        return result if isinstance(result, list) else []

    # ── Pipeline ───────────────────────────────────────────────────────

    async def get_pipeline(self, client_id: str) -> dict | None:
        return await self._get(f"/api/agent/pipeline?clientId={client_id}")

    async def update_pipeline(
        self,
        client_id: str,
        phase: str,
        progress: int,
        active_agents: list[str],
    ) -> dict | None:
        return await self._post(
            "/api/agent/pipeline/update",
            {
                "clientId": client_id,
                "currentPhase": phase,
                "phaseProgress": progress,
                "activeAgents": active_agents,
                "lastActivity": int(__import__("time").time() * 1000),
            },
        )
