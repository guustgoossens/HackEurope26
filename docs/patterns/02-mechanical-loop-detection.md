# Pattern 2: Mechanical Loop Detection

## Source

[OpenClaw's tool-loop-detection.ts](https://github.com/PicoCreator/OpenClaw).

OpenClaw handles stuck agents mechanically rather than through prompt engineering. Instead of telling the agent "don't retry the same thing" (which it ignores when confused), the infrastructure detects repeated tool calls and breaks the loop cleanly.

---

## Problem

The previous approach used a `MAX_CONSECUTIVE_ERRORS` counter in each agent loop:

```python
# OLD (removed):
consecutive_errors = 0
MAX_CONSECUTIVE_ERRORS = 3
...
if result.is_error:
    consecutive_errors += 1
    if consecutive_errors >= MAX_CONSECUTIVE_ERRORS:
        break
else:
    consecutive_errors = 0
```

This has a critical gap: **semantic loops**. If an agent calls the same tool with the same arguments but gets different error messages each time (e.g., a transient API error that resolves, or a misformatted response that varies), the counter resets on success and the loop continues indefinitely.

More practically, pip install loops look like:

```
Turn 1: install_package("google-api-python-client")       → error
Turn 2: install_package("google-auth google-auth-oauthlib") → error
Turn 3: install_package("google-auth")                     → error
```

Three different hashes. Counter never trips. Agent spirals.

---

## Implementation

```python
# agents/src/agents/tools/loop_detection.py

class ToolLoopDetector:
    def __init__(self, repeat_threshold: int = 3, history_size: int = 20):
        self._repeat_threshold = repeat_threshold
        self._history: deque[str] = deque(maxlen=history_size)

    def record(self, tool_name: str, tool_args: dict) -> None:
        key = f"{tool_name}:{json.dumps(tool_args, sort_keys=True, default=str)}"
        h = hashlib.md5(key.encode()).hexdigest()
        self._history.append(h)

    def is_stuck(self) -> bool:
        if len(self._history) < self._repeat_threshold:
            return False
        counts = Counter(self._history)
        return any(count >= self._repeat_threshold for count in counts.values())
```

Each tool call is hashed as `md5(tool_name + ":" + json.dumps(args, sort_keys=True))`. A sliding window of the last 20 hashes is maintained. When any identical hash appears 3+ times, `is_stuck()` returns `True` and the agent loop breaks.

**Integration** — all three sub-agent loops use it identically:

```python
# explorer.py:114, structurer.py:82, knowledge_writer.py:73
detector = ToolLoopDetector()
for turn in range(self.max_turns):
    ...
    for tc in tool_calls_raw:
        detector.record(tc["name"], tc["input"])
    if detector.is_stuck():
        logger.warning(f"Agent stuck in loop, breaking")
        break
```

No injected messages, no prompt hacks — just a mechanical stop.

---

## Known Gap: Semantic Variants

The hash-based approach detects **exact repeats**. Semantic variants of the same operation (different pip install strings, `env | grep google` vs `env | grep gmail`) produce different hashes and are not caught.

Observed in Feb 2026 debugging:
```
install_package("google-api-python-client")           → hash A
install_package("google-auth google-auth-oauthlib google-auth-httplib2 ...") → hash B
install_package("google-auth")                        → hash C
```

Three distinct hashes → loop detector doesn't fire.

**Potential mitigations:**
- Normalize `run_command` and `install_package` args (strip specific package names, just track that the tool was called)
- Add a secondary counter: "if `run_command` appears > 5 times in window, break regardless of args"
- Semantic similarity check on the tool + first word of command

---

## Files

| File | Lines | What |
|------|-------|------|
| `agents/src/agents/tools/loop_detection.py` | 1–54 | Full `ToolLoopDetector` class |
| `agents/src/agents/sub_agents/explorer.py` | 114, 175–179 | Integration: `detector = ToolLoopDetector()`, `detector.record()`, `detector.is_stuck()` |
| `agents/src/agents/sub_agents/structurer.py` | 82 | Same integration |
| `agents/src/agents/sub_agents/knowledge_writer.py` | 73 | Same integration |
