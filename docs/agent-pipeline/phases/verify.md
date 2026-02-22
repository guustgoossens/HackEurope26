# Phase 3: Verify

## What Happens

MasterAgent handles this phase directly — no sub-agents. It turns `state.open_contradictions` into a structured questionnaire, pushes it to Convex, and polls for human responses.

```
MasterAgent
    │
    ├── Claude + generate_questionnaire tool
    │   → creates MCQ from open_contradictions
    │   → e.g. "This column 'Ref' appears in 340 rows.
    │          Options: [Invoice reference, Client code, Internal ID]"
    │
    ├── convex.create_questionnaire(client_id, title, questions)
    │   → questionnaire pushed to Convex (status: "sent")
    │   → UI shows QuestionCard components immediately
    │
    └── Poll loop (exponential backoff: 5s → max 30s)
        → convex.get_questionnaire_responses(questionnaire_id)
        → wait until responses >= questions count
        → resolve contradictions based on answers
        → state.open_contradictions cleared
```

## Polling Pattern

Python agents can't subscribe to Convex reactively — they poll:

```python
backoff = 5
while True:
    responses = await self.convex.get_questionnaire_responses(questionnaire_id)
    if len(responses) >= len(questions):
        break
    await asyncio.sleep(backoff)
    backoff = min(backoff * 1.5, 30)  # max 30s between checks
```

## Human Experience

The dashboard's VerifyPanel renders `QuestionCard` components — one per questionnaire question. Human answers with a radio button click. The response is immediately written to Convex and picked up by the next poll cycle.

## Why No Sub-Agents

Verification is a waiting phase. Spawning sub-agents to wait would be wasteful. MasterAgent handles the questionnaire logic directly and doesn't need tool-calling during the wait.

## Outputs

- `questionnaires` table entry in Convex
- `questionnaire_responses` entries when human answers
- `state.open_contradictions` cleared for each resolved item
- Contradictions in Convex marked `resolved` with explanation
