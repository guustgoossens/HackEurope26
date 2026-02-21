import logging
import os
import shutil
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)

try:
    import magic

    _HAS_MAGIC = True
except ImportError:
    _HAS_MAGIC = False


class SandboxFileManager:
    """Manages isolated temp directories for pipeline runs."""

    def create_workspace(self, client_id: str) -> str:
        """Create an isolated workspace directory. Returns absolute path."""
        workspace = f"/tmp/sandbox_{client_id}_{uuid.uuid4().hex[:8]}"
        os.makedirs(workspace, exist_ok=True)
        logger.info(f"Created workspace: {workspace}")
        return workspace

    def stage_file(self, workspace: str, filename: str, content: bytes) -> str:
        """Write bytes to workspace, return absolute path."""
        filepath = os.path.join(workspace, filename)
        # Ensure subdirectories exist if filename contains path separators
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "wb") as f:
            f.write(content)
        logger.info(f"Staged file: {filepath} ({len(content)} bytes)")
        return filepath

    def read_file(self, filepath: str, max_bytes: int | None = None) -> bytes:
        """Read file content as bytes."""
        with open(filepath, "rb") as f:
            if max_bytes:
                return f.read(max_bytes)
            return f.read()

    def read_file_text(self, filepath: str, max_chars: int = 50000) -> str:
        """Read file content as text, truncating if needed."""
        with open(filepath, "r", errors="replace") as f:
            return f.read(max_chars)

    def list_files(self, workspace: str) -> list[dict]:
        """List files in workspace with sizes and MIME types."""
        files = []
        workspace_path = Path(workspace)
        if not workspace_path.exists():
            return files

        for item in sorted(workspace_path.rglob("*")):
            if item.is_file():
                rel_path = str(item.relative_to(workspace_path))
                info = {
                    "path": rel_path,
                    "absolute_path": str(item),
                    "size_bytes": item.stat().st_size,
                }
                if _HAS_MAGIC:
                    try:
                        info["mime_type"] = magic.from_file(str(item), mime=True)
                    except Exception:
                        info["mime_type"] = "unknown"
                files.append(info)
        return files

    def cleanup(self, workspace: str) -> None:
        """Remove entire workspace directory."""
        if os.path.exists(workspace) and workspace.startswith("/tmp/sandbox_"):
            shutil.rmtree(workspace, ignore_errors=True)
            logger.info(f"Cleaned up workspace: {workspace}")

    def detect_mime(self, filepath: str) -> str:
        """Detect MIME type of a file."""
        if _HAS_MAGIC:
            try:
                return magic.from_file(filepath, mime=True)
            except Exception:
                pass
        # Fallback: guess from extension
        ext = Path(filepath).suffix.lower()
        mime_map = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".mp4": "video/mp4",
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".csv": "text/csv",
            ".json": "application/json",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".txt": "text/plain",
        }
        return mime_map.get(ext, "application/octet-stream")

    def validate_path(self, filepath: str, workspace: str) -> bool:
        """Check that filepath is inside the workspace (prevent path traversal)."""
        real_file = os.path.realpath(filepath)
        real_workspace = os.path.realpath(workspace)
        return real_file.startswith(real_workspace + os.sep) or real_file == real_workspace
