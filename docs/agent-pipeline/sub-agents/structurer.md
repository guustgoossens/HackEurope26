# StructurerAgent

`agents/src/agents/sub_agents/structurer.py`

---

## Role

Processes a batch of file references, extracts content via Gemini, classifies relevance, and flags contradictions. Runs concurrently with other structurer instances in batches.

## Constructor

```python
StructurerAgent(
    llm: AnthropicAdapter,
    gemini: GeminiAdapter,
    convex: ConvexClient,
    client_id: str,
    file_references: list[dict],  # files to process this batch
    knowledge_tree_context: str,  # tree structure from Phase 2 design
)
```

## System Prompt

Similar capabilities-focused style to ExplorerAgent, focused on extraction and classification rather than discovery.

## Agentic Loop

Max turns: **20**. Uses `ToolLoopDetector(repeat_threshold=3, history_size=20)`.

The structurer typically:
1. Checks forum for prior extraction guides for this file type
2. Calls `extract_content` (Gemini) on each file reference
3. Calls `classify_relevance` (Claude) to determine KB relevance
4. Calls `add_contradiction` if conflicting data is found
5. Writes extraction tips to forum for future structurers
6. Calls `message_master` with summary of findings

## Intercepted Tools

- `add_contradiction` — stored in `SubAgentReport.contradictions` and written to Convex
- `message_master` — stored in `SubAgentReport.messages` (no executor needed)

## Outputs

Returns `SubAgentReport`:
```python
contradictions: list[dict]  # each: {description, source_a, source_b, value_a, value_b}
messages: list[str]         # findings reported via message_master
findings: list[str]
```

MasterAgent merges all structurer reports into `state.open_contradictions` before Phase 3.

## Tools

See [tools.md — Structurer Tools](../tools.md#structurer-tools).
