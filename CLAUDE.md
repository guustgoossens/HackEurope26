# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HackEurope26 is a full-stack app for making company data "AI-ready" — connecting messy, scattered business data sources (accounting firms, etc.) and organizing them into structured, AI-navigable knowledge bases with human-in-the-loop verification.

See `docs/README.md` for the full concept: skill-based knowledge base, agent forum, verification questionnaire, and the five-phase workflow (Onboard → Explore → Structure → Verify → Use).

## Commands

```bash
bun install              # Install dependencies
bun run dev              # Start frontend (Vite) + backend (Convex) in parallel
bun run dev:frontend     # Frontend only (Vite on localhost:5173)
bun run dev:backend      # Backend only (Convex dev server)
bun run build            # TypeScript check + Vite production build
bun run lint             # TypeScript + ESLint
bun run format           # Prettier (printWidth: 120, singleQuote: true)
```

## Architecture

**Frontend:** React 19 + Vite + Tailwind CSS 4. Path alias `@/` → `./src/`.

**Backend:** Convex (real-time BaaS). Functions live in `convex/` with file-based routing. Schema in `convex/schema.ts`. Auto-generated types in `convex/_generated/` (never edit these).

**Auth:** WorkOS AuthKit → Convex JWT integration. Custom provider in `src/ConvexProviderWithAuthKit.tsx` bridges WorkOS auth state into Convex's auth system.

**Provider chain** (in `src/main.tsx`): ErrorBoundary → (demo mode or auth mode). See **Demo mode** below.

**Demo mode** (`VITE_DEMO_SKIP_AUTH=true`): No WorkOS. Landing at `/`, app démo at `/demo`. Entry: `DemoApp` in `src/DemoApp.tsx` (Landing first, then `/demo` → ClientDetail with Convex demo client). URLs: sync via `history.pushState` and `popstate`. Handoff details: `docs/HANDOFF.md`.

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

Frontend (in `.env.local`): `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`, `VITE_WORKOS_CLIENT_ID`, `VITE_WORKOS_REDIRECT_URI`, `VITE_DEMO_SKIP_AUTH` (when `true`: no WorkOS, landing at `/`, démo at `/demo`)

Backend (Convex dashboard): `WORKOS_API_KEY`, `CONVEX_DEPLOYMENT`

## Tech Stack

- Gemini for multimodal data processing (PDFs, images, spreadsheets, emails)
- Claude for agent orchestration and knowledge structure generation
- Convex for real-time reactive backend
- React 19 + Vite 7 + Tailwind CSS 4 for frontend
- WorkOS AuthKit for authentication
- TypeScript throughout (strict mode)
