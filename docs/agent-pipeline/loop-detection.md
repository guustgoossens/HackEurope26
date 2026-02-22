# Loop Detection

Technical reference for `ToolLoopDetector`. For design rationale and source inspiration, see [patterns/02-mechanical-loop-detection.md](../patterns/02-mechanical-loop-detection.md).

---

## Class

```python
# agents/src/agents/tools/loop_detection.py

class ToolLoopDetector:
    def __init__(self, repeat_threshold: int = 3, history_size: int = 20)
    def record(self, tool_name: str, tool_args: dict) -> None
    def is_stuck(self) -> bool
    def reset(self) -> None
```

**Defaults:**
- `repeat_threshold=3` — same call 3+ times triggers stuck detection
- `history_size=20` — sliding window of last 20 tool calls

---

## Usage Pattern

All three agent loops use it identically:

```python
detector = ToolLoopDetector()

for turn in range(self.max_turns):
    text, tool_calls_raw = await self.llm.complete_with_tools_messages(...)

    if not tool_calls_raw:
        break

    for tc in tool_calls_raw:
        call = ToolCall(id=tc["id"], name=tc["name"], input=tc["input"])
        detector.record(call.name, call.input)   # ← record before executing
        result = await self.executor.execute(call)

    if detector.is_stuck():
        logger.warning("Agent stuck in loop, breaking")
        break
```

Note: `record()` is called before execution. The detector tracks *intent*, not outcomes.

---

## How Hashing Works

```python
key = f"{tool_name}:{json.dumps(tool_args, sort_keys=True, default=str)}"
h = hashlib.md5(key.encode()).hexdigest()
```

`sort_keys=True` ensures `{"a": 1, "b": 2}` and `{"b": 2, "a": 1}` hash identically. `default=str` handles non-serializable values.

---

## Integration Points

| File | Line | How Used |
|------|------|----------|
| `sub_agents/explorer.py` | 114, 143, 175 | `detector = ToolLoopDetector()`, `.record()`, `.is_stuck()` |
| `sub_agents/structurer.py` | 82 | Same pattern |
| `sub_agents/knowledge_writer.py` | 73 | Same pattern |

---

## Known Limitation

Semantic variants (same operation, different argument strings) produce different hashes and are not detected. See [patterns/02-mechanical-loop-detection.md — Known Gap](../patterns/02-mechanical-loop-detection.md#known-gap-semantic-variants) for mitigation options.
