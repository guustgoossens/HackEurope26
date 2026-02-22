import asyncio
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Transient HTTP status codes worth retrying
_RETRYABLE_STATUS = {502, 503, 504}


class ConvexClient:
    """HTTP client for communicating with Convex backend endpoints."""

    def __init__(self, base_url: str, auth_token: str, timeout: int = 30, max_retries: int = 3):
        self._base_url = base_url.rstrip("/")
        self._auth_token = auth_token
        self._timeout = timeout
        self._max_retries = max_retries
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self):
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            headers={
                "Authorization": f"Bearer {self._auth_token}",
                "Content-Type": "application/json",
            },
            timeout=float(self._timeout),
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._client:
            await self._client.aclose()
            self._client = None

    async def _post(self, path: str, payload: dict, critical: bool = False) -> dict | None:
        last_err: Exception | None = None
        for attempt in range(self._max_retries):
            try:
                resp = await self._client.post(path, json=payload)
                if resp.status_code in _RETRYABLE_STATUS and attempt < self._max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                resp.raise_for_status()
                return resp.json()
            except (httpx.ConnectError, httpx.ReadTimeout) as e:
                last_err = e
                if attempt < self._max_retries - 1:
                    logger.warning(f"Convex POST {path} transient error (attempt {attempt + 1}): {e}")
                    await asyncio.sleep(2 ** attempt)
                    continue
            except Exception as e:
                last_err = e
                break
        logger.warning(f"Convex POST {path} failed after {self._max_retries} attempts: {last_err}")
        if critical:
            raise RuntimeError(f"Critical Convex POST {path} failed: {last_err}") from last_err
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
            critical=True,
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
        payload: dict[str, Any] = {
            "clientId": client_id,
            "name": name,
            "type": type,
            "order": order,
        }
        if parent_id:
            payload["parentId"] = parent_id
        if readme:
            payload["readme"] = readme
        return await self._post("/api/agent/knowledge/node", payload, critical=True)

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
        payload: dict[str, Any] = {
            "clientId": client_id,
            "treeNodeId": tree_node_id,
            "title": title,
            "content": content,
            "confidence": confidence,
            "verified": verified,
        }
        if source_ref:
            payload["sourceRef"] = source_ref
        return await self._post("/api/agent/knowledge/entry", payload, critical=True)

    # ── Agent forum ────────────────────────────────────────────────────

    async def search_forum(
        self,
        query: str,
        source_type: str | None = None,
        phase: str | None = None,
        file_type: str | None = None,
    ) -> list[dict]:
        payload: dict[str, Any] = {"query": query}
        if source_type is not None:
            payload["sourceType"] = source_type
        if phase is not None:
            payload["phase"] = phase
        if file_type is not None:
            payload["fileType"] = file_type
        result = await self._post("/api/agent/forum/search", payload)
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
        source_type: str | None = None,
        phase: str | None = None,
        file_type: str | None = None,
    ) -> dict | None:
        payload: dict[str, Any] = {
            "title": title,
            "category": category,
            "content": content,
            "authorAgent": author_agent,
            "tags": tags,
        }
        if source_type is not None:
            payload["sourceType"] = source_type
        if phase is not None:
            payload["phase"] = phase
        if file_type is not None:
            payload["fileType"] = file_type
        return await self._post("/api/agent/forum/create", payload)

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
