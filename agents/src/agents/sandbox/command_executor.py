import asyncio
import logging
import re
import shlex

logger = logging.getLogger(__name__)

ALLOWED_PREFIXES = [
    "ffmpeg",
    "pdftotext",
    "tesseract",
    "python",
    "python3",
    "uv pip install",
    "file",
    "convert",
    "wc",
    "head",
    "tail",
    "cat",
    "ls",
    "mkdir",
    "cp",
    "mv",
]

BLOCKED_PATTERNS = [
    re.compile(r"rm\s+-rf\s+/"),
    re.compile(r"curl\s+.*\|\s*sh"),
    re.compile(r"curl\s+.*\|\s*bash"),
    re.compile(r"wget\s+.*\|\s*sh"),
    re.compile(r"wget\s+.*\|\s*bash"),
    re.compile(r"eval\s+"),
    re.compile(r"exec\s+"),
    re.compile(r">\s*/etc/"),
    re.compile(r">\s*/proc/"),
    re.compile(r">\s*/sys/"),
    re.compile(r"chmod\s+.*\+s"),
    re.compile(r"mkfifo"),
    re.compile(r"nc\s+-l"),
    re.compile(r"python.*-c.*import\s+os.*system"),
]

MAX_TIMEOUT = 300


class CommandExecutor:
    """Executes shell commands with safety constraints."""

    def _validate_command(self, command: str) -> str | None:
        """Validate command against allowlist/blocklist. Returns error message or None."""
        stripped = command.strip()

        # Check blocklist first
        for pattern in BLOCKED_PATTERNS:
            if pattern.search(stripped):
                return f"Blocked: command matches dangerous pattern '{pattern.pattern}'"

        # Check allowlist
        allowed = False
        for prefix in ALLOWED_PREFIXES:
            if stripped.startswith(prefix):
                allowed = True
                break

        if not allowed:
            return (
                f"Blocked: command must start with one of: {', '.join(ALLOWED_PREFIXES)}. "
                f"Got: '{stripped[:50]}'"
            )

        return None

    async def run_command(
        self,
        command: str,
        workspace: str,
        timeout: int = 60,
    ) -> dict:
        """Run a command in subprocess, cwd=workspace.

        Returns dict with stdout, stderr, return_code, and success.
        """
        # Validate
        error = self._validate_command(command)
        if error:
            logger.warning(f"Command rejected: {error}")
            return {
                "stdout": "",
                "stderr": error,
                "return_code": -1,
                "success": False,
            }

        # Clamp timeout
        timeout = min(max(timeout, 1), MAX_TIMEOUT)

        # Parse command into args (no shell=True)
        try:
            args = shlex.split(command)
        except ValueError as e:
            return {
                "stdout": "",
                "stderr": f"Failed to parse command: {e}",
                "return_code": -1,
                "success": False,
            }

        logger.info(f"Executing: {command} (timeout={timeout}s, cwd={workspace})")

        try:
            proc = await asyncio.create_subprocess_exec(
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=workspace,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=timeout
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                return {
                    "stdout": "",
                    "stderr": f"Command timed out after {timeout}s",
                    "return_code": -1,
                    "success": False,
                }

            stdout_str = stdout.decode("utf-8", errors="replace")
            stderr_str = stderr.decode("utf-8", errors="replace")

            logger.info(
                f"Command finished: return_code={proc.returncode}, "
                f"stdout={len(stdout_str)} chars, stderr={len(stderr_str)} chars"
            )

            return {
                "stdout": stdout_str,
                "stderr": stderr_str,
                "return_code": proc.returncode,
                "success": proc.returncode == 0,
            }

        except FileNotFoundError:
            return {
                "stdout": "",
                "stderr": f"Command not found: {args[0]}",
                "return_code": -1,
                "success": False,
            }
        except Exception as e:
            return {
                "stdout": "",
                "stderr": f"Execution error: {e}",
                "return_code": -1,
                "success": False,
            }
