# Real-Time Data Flow

How agents write data and the UI updates instantly via Convex reactive subscriptions.

---

## Pipeline Trigger (Updated Feb 2026)

The pipeline is triggered by a **direct HTTP POST** from the frontend to the Python agent server — not via a Convex action:

```
ClientDetail.tsx
    │
    ├── "Start Exploration" button clicked
    │
    ▼
fetch(`${VITE_AGENT_SERVER_URL}/run`, {
  method: "POST",
  body: JSON.stringify({ clientId }),
  headers: { Authorization: "Bearer ..." }
})
    │
    ▼
agents/src/agents/main.py (HTTP server)
    │
    ▼
MasterAgent.run(clientId)
```

This replaced an earlier approach that called `triggerPipeline` as a Convex action. The direct fetch decouples pipeline triggering from Convex — useful since Convex actions have execution time limits and the pipeline can run for minutes.

---

## Agent → Convex → UI (Real-Time Loop)

Once the pipeline is running, all writes go through the HTTP bridge:

```
Python Agent                    Convex                     React Frontend
     │                            │                              │
     │── POST /api/agent/event ──▶│                              │
     │                            │── agent_events ─────────────▶│ AgentEventFeed
     │                            │   (reactive subscription)    │ (auto-scroll)
     │                            │                              │
     │── POST /knowledge/node ──▶│                              │
     │                            │── knowledge_tree ───────────▶│ KnowledgeTree
     │                            │   (reactive subscription)    │ (live update)
     │                            │                              │
     │── POST /contradiction ───▶│                              │
     │                            │── contradictions ───────────▶│ ContradictionsList
     │                            │   (reactive subscription)    │ (live update)
     │                            │                              │
     │── POST /pipeline/update ─▶│                              │
     │                            │── pipeline_status ──────────▶│ ExploreMetrics
     │                            │   (reactive subscription)    │ (progress bar)
```

Everything the agents write appears in the UI within milliseconds. Convex's reactive queries handle this without polling on the frontend.

---

## Frontend Subscriptions

React components use `useQuery` which maintains a WebSocket subscription to Convex:

```typescript
// AgentEventFeed.tsx
const events = useQuery(api.agentEvents.listByClient, { clientId });

// KnowledgeTree.tsx
const tree = useQuery(api.knowledge.getTree, { clientId });

// ExploreMetrics.tsx
const pipeline = useQuery(api.pipeline.getByClient, { clientId });
```

When the agent writes a new event, Convex pushes the update to all subscribed clients instantly. No polling, no manual refresh.

---

## Human → Convex → Agent (Verify Phase)

In the verify phase, the flow reverses:

```
QuestionCard.tsx
    │  useMutation(questionnaires.respond)
    ▼
Convex questionnaire_responses table updated
    │
    ▼
Python MasterAgent polling loop:
    await self.convex.get_questionnaire_responses(questionnaire_id)
    (exponential backoff: 5s → max 30s between polls)
    │
    ▼
Responses received → contradictions resolved → Phase 4 starts
```

Python can't subscribe to Convex reactively, so polling is the mechanism here.
