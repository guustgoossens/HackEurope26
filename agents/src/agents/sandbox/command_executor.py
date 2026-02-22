import asyncio
import logging
import os
import re

logger = logging.getLogger(__name__)

# Env var prefixes/substrings to strip from sandbox subprocess environment.
# Prevents agents from discovering host credentials and going down the DIY-auth path.
_STRIP_ENV_PATTERNS = re.compile(
    r"(GOOGLE|GCLOUD|GMAIL|OAUTH|COMPOSIO|WORKOS|ANTHROPIC|OPENAI|GEMINI|AWS|AZURE)",
    re.IGNORECASE,
)


def _sandbox_env() -> dict[str, str]:
    """Return a clean env for sandbox subprocesses with credential vars stripped."""
    return {k: v for k, v in os.environ.items() if not _STRIP_ENV_PATTERNS.search(k)}

# Block only genuinely destructive / escape-from-sandbox patterns.
# Everything else is allowed — agents should be able to use grep, env, find, curl, etc.
BLOCKED_PATTERNS = [
    re.compile(r"rm\s+-rf\s+/"),           # wipe root
    re.compile(r"rm\s+-rf\s+~"),           # wipe home
    re.compile(r":\s*\(\s*\)\s*\{"),       # fork bomb
    re.compile(r"curl\s+.*\|\s*(?:sh|bash|zsh|python\d?)"),   # remote shell
    re.compile(r"wget\s+.*\|\s*(?:sh|bash|zsh|python\d?)"),   # remote shell
    re.compile(r">\s*/etc/"),              # overwrite system files
    re.compile(r">\s*/proc/"),
    re.compile(r">\s*/sys/"),
    re.compile(r"chmod\s+\+s"),            # SUID
    re.compile(r"\bdd\b.*of=/dev/(?:sd|hd|nvme|vd)"),  # disk wipe
    re.compile(r"mkfifo"),                 # named pipe (often used for backdoors)
    re.compile(r"nc\s+-l"),               # netcat listener
]

MAX_TIMEOUT = 300


class CommandExecutor:
    """Executes shell commands with a minimal safety blocklist.

    Uses shell=True so that pipes, redirects, and shell builtins work normally.
    Only blocks patterns that are genuinely destructive or escape-from-sandbox.
    """

    def _validate_command(self, command: str) -> str | None:
        """Check against blocklist. Returns error message or None if safe."""
        stripped = command.strip()
        for pattern in BLOCKED_PATTERNS:
            if pattern.search(stripped):
                return f"Blocked: command matches dangerous pattern '{pattern.pattern}'"
        return None

    async def run_command(
        self,
        command: str,
        workspace: str,
        timeout: int = 60,
    ) -> dict:
        """Run a shell command (via /bin/sh) with cwd=workspace.

        Returns dict with stdout, stderr, return_code, and success.
        """
        error = self._validate_command(command)
        if error:
            logger.warning(f"Command rejected: {error}")
            return {
                "stdout": "",
                "stderr": error,
                "return_code": -1,
                "success": False,
            }

        timeout = min(max(timeout, 1), MAX_TIMEOUT)

        logger.info(f"Executing: {command} (timeout={timeout}s, cwd={workspace})")

        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=workspace,
                env=_sandbox_env(),
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

        except Exception as e:
            return {
                "stdout": "",
                "stderr": f"Execution error: {e}",
                "return_code": -1,
                "success": False,
            }
