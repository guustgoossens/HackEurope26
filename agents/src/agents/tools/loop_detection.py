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

    def __init__(self, repeat_threshold: int = 3, history_size: int = 20):
        self._repeat_threshold = repeat_threshold
        self._history: deque[str] = deque(maxlen=history_size)

    def record(self, tool_name: str, tool_args: dict) -> None:
        """Record a tool call. Call once per tool invocation."""
        key = f"{tool_name}:{json.dumps(tool_args, sort_keys=True, default=str)}"
        h = hashlib.md5(key.encode()).hexdigest()
        self._history.append(h)

    def is_stuck(self) -> bool:
        """Return True if any single call hash appears >= repeat_threshold times."""
        if len(self._history) < self._repeat_threshold:
            return False
        from collections import Counter

        counts = Counter(self._history)
        for call_hash, count in counts.items():
            if count >= self._repeat_threshold:
                return True
        return False

    def reset(self) -> None:
        """Clear history."""
        self._history.clear()
