import asyncio
import logging
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .sandbox import SandboxFileManager

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(title="HackEurope26 Agent Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Track running pipelines and their workspaces
_running_pipelines: dict[str, asyncio.Task] = {}
_active_workspaces: dict[str, str] = {}
_file_manager = SandboxFileManager()


class PipelineRequest(BaseModel):
    client_id: str
    auth_token: str


class PipelineResponse(BaseModel):
    status: str
    message: str


async def _run_pipeline(client_id: str):
    """Run the full agent pipeline for a client."""
    workspace = _file_manager.create_workspace(client_id)
    _active_workspaces[client_id] = workspace
    try:
        from .main import main
        await main(client_id)
        logger.info(f"Pipeline completed for client {client_id}")
    except Exception as e:
        logger.error(f"Pipeline failed for client {client_id}: {e}")
    finally:
        _running_pipelines.pop(client_id, None)
        ws = _active_workspaces.pop(client_id, None)
        if ws:
            _file_manager.cleanup(ws)


@app.post("/api/pipeline/start", response_model=PipelineResponse)
async def start_pipeline(request: PipelineRequest):
    expected_token = os.environ.get("AGENT_AUTH_TOKEN", "")
    if expected_token and request.auth_token != expected_token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if request.client_id in _running_pipelines:
        return PipelineResponse(
            status="already_running",
            message=f"Pipeline already running for client {request.client_id}",
        )

    task = asyncio.create_task(_run_pipeline(request.client_id))
    _running_pipelines[request.client_id] = task

    return PipelineResponse(
        status="started",
        message=f"Pipeline started for client {request.client_id}",
    )


@app.get("/api/pipeline/status/{client_id}")
async def pipeline_status(client_id: str):
    if client_id in _running_pipelines:
        task = _running_pipelines[client_id]
        return {"status": "running" if not task.done() else "completed"}
    return {"status": "idle"}


@app.get("/api/workspace/{client_id}/files")
async def workspace_files(client_id: str):
    """Debug endpoint: list files in a client's active workspace."""
    workspace = _active_workspaces.get(client_id)
    if not workspace:
        return {"status": "no_workspace", "files": []}
    files = _file_manager.list_files(workspace)
    return {"status": "active", "workspace": workspace, "files": files}


@app.get("/health")
async def health():
    return {"status": "ok"}
