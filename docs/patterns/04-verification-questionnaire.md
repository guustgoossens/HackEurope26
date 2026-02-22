# Pattern 4: Human-in-the-Loop Verification Questionnaire

## Source

Original product vision: AI agents can crawl personal data, but they lack proper indexation and often hallucinate on ambiguous cases. The system should surface ambiguities as structured questionnaires rather than making best-guess decisions.

"The agent builds the draft; the human corrects the shape."

---

## Problem

Real company data is full of legitimate ambiguities:

- "Ref" column in 340 rows — is it invoice reference, client code, or internal ID?
- Q3 revenue appears as 847K in Gmail and 823K in the spreadsheet — which is correct? (Both might be — one is HT, one is TTC)
- Three files all named "Bilan 2023" — are they versions, or different documents?

A RAG-based approach would pick the most confident answer. That produces hallucination at the KB level — wrong data baked into the knowledge base permanently. The verification questionnaire forces these ambiguities to the surface where a human resolves them once.

---

## Implementation

### Phase 3 Flow (MasterAgent)

```
Structurer agents flag contradictions via add_contradiction tool
        │
        ▼
state.open_contradictions accumulated in PipelineState
        │
        ▼
Claude + generate_questionnaire tool
    → creates MCQ questions from open contradictions
    → e.g. "'Ref' column in 340 entries — which type?"
          Options: ["Invoice reference", "Client code", "Internal ID"]
        │
        ▼
convex.create_questionnaire(client_id, title, questions)
    → stored in Convex questionnaires table
    → status: "sent"
        │
        ▼
Frontend renders QuestionCard per question
    → Human answers in dashboard UI
        │
        ▼
MasterAgent polls with exponential backoff (5s → 30s)
    → convex.get_questionnaire_responses(questionnaire_id)
        │
        ▼
Responses arrive → resolve contradictions:
    for resp in responses:
        state.open_contradictions = [
            c for c in state.open_contradictions
            if c.get("id") != contradiction_id
        ]
        │
        ▼
Phase 4 (Use) starts with verified, paradox-free contradiction state
```

### Schema

```typescript
// convex/schema.ts:48-69
questionnaires: defineTable({
  clientId: v.id('clients'),
  title: v.string(),
  questions: v.array(v.object({
    id: v.string(),
    text: v.string(),
    options: v.array(v.string()),
    contradictionId: v.optional(v.id('contradictions')),
  })),
  status: v.union(v.literal('draft'), v.literal('sent'), v.literal('completed')),
})

questionnaire_responses: defineTable({
  questionnaireId: v.id('questionnaires'),
  questionId: v.string(),
  selectedOption: v.string(),
  respondedBy: v.string(),
})
```

Each question links to a `contradictionId` — when the human answers, the contradiction is marked `resolved`. The `resolution` field captures the human's chosen explanation.

### The Polling Pattern

MasterAgent uses async polling with backoff rather than reactive subscriptions (Python can't subscribe to Convex reactively):

```python
# master_agent.py — verify phase
backoff = 5
while True:
    responses = await self.convex.get_questionnaire_responses(questionnaire_id)
    if len(responses) >= len(questions):
        break
    await asyncio.sleep(backoff)
    backoff = min(backoff * 1.5, 30)
```

---

## Why Not Auto-Resolve?

Quantitative contradictions in accounting are frequently **definitional, not errors**:
- 847K HT vs 823K TTC — both correct, different tax treatment
- Q3 provisional vs Q3 audited — both correct, different timing
- Two "Bilan 2023" files — could be draft vs final

Auto-resolving at the wrong level would permanently corrupt the KB. Human judgment is not a fallback — it's the feature. The output is a **paradox-free** knowledge base, not a best-guess one.

---

## Files

| File | Lines | What |
|------|-------|------|
| `agents/src/agents/master_agent.py` | ~640–835 | Verify phase: questionnaire generation, polling, resolution |
| `convex/schema.ts` | 48–69 | `questionnaires` + `questionnaire_responses` tables |
| `convex/questionnaires.ts` | — | `create`, `respond`, `internalGetResponses` |
| `src/components/QuestionCard.tsx` | — | Frontend MCQ component |
| `src/pages/ClientDetail.tsx` | VerifyPanel | Phase panel displaying questionnaire |
