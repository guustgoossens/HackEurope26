# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HackEurope26 is a full-stack app for making company data "AI-ready" — connecting messy, scattered business data sources (accounting firms, etc.) and organizing them into structured, AI-navigable knowledge bases with human-in-the-loop verification.

**5-phase pipeline:** Onboard → Explore → Structure → Verify → Use

See `docs/README.md` for detailed docs (organized in subdirectories: `getting-started/`, `architecture/`, `agent-pipeline/`, `patterns/`, `convex/`, `frontend/`, `decisions/`, `product/`).

## Commands

```bash
# Frontend + Backend (TypeScript / Convex)
bun install              # Install dependencies
bun run dev              # Start frontend (Vite) + backend (Convex) in parallel
bun run dev:frontend     # Frontend only (Vite on localhost:5173)
bun run dev:backend      # Backend only (Convex dev server)
bun run build            # TypeScript check + Vite production build
bun run lint             # TypeScript + ESLint
bun run format           # Prettier (printWidth: 120, singleQuote: true)

# Agent Pipeline (Python)
cd agents && uv sync                          # Install Python dependencies
cd agents && uv run uvicorn agents.server:app --reload --port 8000  # Run agent server
```

## Architecture

### Frontend
React 19 + Vite 7 + Tailwind CSS 4. Path alias `@/` → `./src/`. i18n via react-i18next (en/fr locales in `src/locales/`).

### Backend
Convex (real-time BaaS). Functions live in `convex/` with file-based routing. Schema in `convex/schema.ts` (11 tables). Auto-generated types in `convex/_generated/` (never edit these). HTTP endpoints in `convex/http.ts` expose `/api/agent/*` routes for the Python agents.

### Agent Pipeline
Python 3.12 + uv, in `agents/`. FastAPI server (`agents/src/agents/server.py`) exposes `POST /api/pipeline/start`. Key modules:
- `master_agent.py` — orchestrates the full 4-phase pipeline (explore → structure → verify → use)
- `sub_agents/explorer.py` — crawls one data source (gmail/drive/sheets), writes to agent forum
- `sub_agents/structurer.py` — processes files, extracts content via Gemini, classifies relevance
- `sub_agents/knowledge_writer.py` — populates the verified knowledge tree
- `tools/loop_detection.py` — hash-based stuck-agent detection (ToolLoopDetector)
- `integrations/composio_client.py` — Composio OAuth for Google Workspace
- `sandbox/` — isolated file manager and command executor per workspace
- `llm/adapters.py` — AnthropicAdapter (Claude) and GeminiAdapter (multimodal extraction)

### Data Flow
1. Frontend triggers pipeline via direct HTTP POST to Python agent server (`VITE_AGENT_SERVER_URL`)
2. Python agents report progress to Convex backend via authenticated HTTP endpoints (`/api/agent/*`)
3. Frontend reactively displays updates via Convex real-time queries

### Auth
WorkOS AuthKit → Convex JWT integration. Custom provider in `src/ConvexProviderWithAuthKit.tsx`.

### Demo Mode
`VITE_DEMO_SKIP_AUTH=true`: No WorkOS. Landing at `/`, demo app at `/demo`. Entry: `DemoApp` in `src/DemoApp.tsx`. Two sub-modes: "live" (real pipeline with ClientDetail) and "narrative" (scripted animation via DemoIndex). URL sync via `history.pushState` and `popstate`.

### Provider Chain (in `src/main.tsx`)
ErrorBoundary → (demo mode: `ConvexProvider` → `DemoApp`) or (auth mode: `AuthKitProvider` → `ConvexProviderWithAuthKit` → `App`).

## Convex Conventions

For detailed Convex rules, examples, and API patterns, refer to `.claude/convex_rules.mdc`. Always consult that file when writing or modifying Convex functions, schemas, or queries.

Key rules (summary):

- **Always use new function syntax** with `args` + `returns` validators on every function (query, mutation, action, and their internal variants)
- **Return validators are required.** Functions that don't return a value must use `returns: v.null()` and explicitly `return null`
- Use `query`/`mutation`/`action` for public functions, `internalQuery`/`internalMutation`/`internalAction` for private ones
- **Never use `filter`** on queries — define indexes and use `withIndex` instead
- Index names must include all fields: e.g. `"by_field1_and_field2"`
- Use `ctx.runQuery`/`ctx.runMutation`/`ctx.runAction` with `FunctionReference` (from `api` or `internal` objects), never pass functions directly
- Actions cannot access `ctx.db` — use `ctx.runQuery`/`ctx.runMutation` to read/write data
- Add `"use node";` at the top of files with actions that need Node.js modules
- Use `v.id("tableName")` for document IDs, not `v.string()`
- Crons: only use `crons.interval` or `crons.cron`, not the deprecated helpers
- HTTP endpoints go in `convex/http.ts` using `httpRouter`

## Environment Variables

Frontend (in `.env.local`):
- `VITE_CONVEX_URL` — Convex deployment URL
- `VITE_WORKOS_CLIENT_ID`, `VITE_WORKOS_REDIRECT_URI` — WorkOS auth
- `VITE_DEMO_SKIP_AUTH` — when `true`: no WorkOS, landing at `/`, demo at `/demo`
- `VITE_AGENT_SERVER_URL` — Python agent server (default `http://localhost:8000`)
- `VITE_AGENT_AUTH_TOKEN` — shared auth token for agent server

Backend (Convex dashboard): `WORKOS_API_KEY`, `AGENT_AUTH_TOKEN`

Agent server: `ANTHROPIC_API_KEY`, `GOOGLE_GENAI_API_KEY`, `CONVEX_SITE_URL`, `AGENT_AUTH_TOKEN`, `COMPOSIO_API_KEY` (optional)

## Tech Stack

- Claude for agent orchestration and knowledge structure generation
- Gemini for multimodal data processing (PDFs, images, spreadsheets, emails)
- Convex for real-time reactive backend
- React 19 + Vite 7 + Tailwind CSS 4 for frontend
- WorkOS AuthKit for authentication
- Composio for Google Workspace OAuth integration
- TypeScript throughout frontend (strict mode), Python 3.12 for agent pipeline
