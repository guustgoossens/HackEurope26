"""Mechanical tool-loop detector for agent loops.

Inspired by OpenClaw's tool-loop-detection.ts. Detects when an agent
is stuck repeating the same tool calls and signals the loop to break.
"""

import hashlib
import json
import logging
from collections import deque

logger = logging.getLogger(__name__)


class ToolLoopDetector:
    """Detects stuck agent loops by tracking repeated tool call patterns.

    Usage:
        detector = ToolLoopDetector()
        for turn in range(max_turns):
            ...
            for tc in tool_calls:
                detector.record(tc["name"], tc["input"])
            if detector.is_stuck():
                logger.warning("Agent stuck in loop, breaking")
                break
    """

    def __init__(self, repeat_threshold: int = 3, history_size: int = 20, name_frequency_multiplier: int = 4):
        self._repeat_threshold = repeat_threshold
        self._name_frequency_multiplier = name_frequency_multiplier
        self._history: deque[str] = deque(maxlen=history_size)
        self._name_history: deque[str] = deque(maxlen=history_size)

    @staticmethod
    def _normalize_args(tool_name: str, tool_args: dict) -> dict:
        """Normalize args for hashing — strip version specs from install commands."""
        if tool_name in ("run_command", "install_package"):
            normalized = {}
            for k, v in tool_args.items():
                if isinstance(v, str) and k in ("command", "package"):
                    # Strip version specifiers (==, >=, <=, ~=, !=, <, >)
                    import re
                    v = re.sub(r'[><=!~]=?\s*[\d\w.*]+', '', v)
                    # Normalize whitespace
                    v = ' '.join(v.split())
                normalized[k] = v
            return normalized
        return tool_args

    def record(self, tool_name: str, tool_args: dict) -> None:
        """Record a tool call. Call once per tool invocation."""
        normalized = self._normalize_args(tool_name, tool_args)
        key = f"{tool_name}:{json.dumps(normalized, sort_keys=True, default=str)}"
        h = hashlib.md5(key.encode()).hexdigest()
        self._history.append(h)
        self._name_history.append(tool_name)

    def is_stuck(self) -> bool:
        """Return True if:
        - any exact call (same tool + same args) repeats >= repeat_threshold times, OR
        - any single tool name appears >= repeat_threshold * name_frequency_multiplier times (catches varied-args loops).
        """
        if len(self._history) < self._repeat_threshold:
            return False
        from collections import Counter

        exact_counts = Counter(self._history)
        for count in exact_counts.values():
            if count >= self._repeat_threshold:
                return True

        name_counts = Counter(self._name_history)
        for count in name_counts.values():
            if count >= self._repeat_threshold * self._name_frequency_multiplier:
                return True

        return False

    def reset(self) -> None:
        """Clear history."""
        self._history.clear()
        self._name_history.clear()
