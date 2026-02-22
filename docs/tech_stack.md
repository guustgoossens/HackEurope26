# Tech Stack

Every technology used in the project, what it does, and why it was chosen.

---

## Frontend

| Technology | Version | Role | Why |
|---|---|---|---|
| **React** | 19 | UI framework | Latest with concurrent features, huge ecosystem |
| **Vite** | 7 | Build tool / dev server | Fast HMR, minimal config, native ESM |
| **Tailwind CSS** | 4 | Styling | Utility-first, no CSS files to manage, v4 with new engine |
| **TypeScript** | 5.9 | Type safety | Strict mode, catches bugs before runtime |
| **Lucide React** | 0.575 | Icons | Tree-shakeable, consistent icon set |
| **clsx** | 2 | Class name utility | Conditional class composition |

**Path alias:** `@/` maps to `./src/` via Vite config.

---

## Backend

| Technology | Version | Role | Why |
|---|---|---|---|
| **Convex** | 1.32 | Real-time BaaS | Reactive queries, schema-first, auto-generated types, built-in full-text search |

Convex provides the database, serverless functions, and real-time subscriptions in one package. Functions live in `convex/` with file-based routing. Schema defined in `convex/schema.ts` with validators that generate TypeScript types automatically.

Key Convex features used:
- **Reactive queries** — dashboard updates instantly as agents write data
- **Full-text search** — forum entry search via `searchIndex`
- **HTTP endpoints** — `convex/http.ts` exposes 11 routes for the Python agent pipeline
- **Internal functions** — agent-only mutations that aren't exposed to the frontend

---

## Authentication

| Technology | Role | Why |
|---|---|---|
| **WorkOS AuthKit** | Identity + SSO | Enterprise-ready auth (SSO, directory sync), clean React SDK, first-class Convex JWT integration |

Provider chain: `AuthKitProvider` → `ConvexProviderWithAuthKit` (custom bridge) → Convex auth context.

---

## AI / LLMs

| Technology | Model | Role | Why |
|---|---|---|---|
| **Claude** | claude-sonnet-4-20250514 | Agent orchestration | Best-in-class tool use, structured reasoning, knowledge tree generation |
| **Gemini** | gemini-2.5-pro | Multimodal extraction | Native PDF/image/spreadsheet understanding, large context window |

**Claude handles:** agentic loops, tool calling, knowledge structuring, questionnaire generation, contradiction reasoning.

**Gemini handles:** extracting content from raw files (PDFs, images, spreadsheets) in their native format.

---

## Agent Pipeline (Python)

| Technology | Version | Role | Why |
|---|---|---|---|
| **Python** | >= 3.12 | Agent runtime | Best LLM SDK ecosystem, async/await, mature tooling |
| **uv** | latest | Package manager | Fast, reliable Python dependency management |
| **anthropic** | >= 0.40 | Claude SDK | Official Python client for Claude API |
| **google-generativeai** | >= 0.8 | Gemini SDK | Official Python client for Gemini API |
| **google-api-python-client** | >= 2.150 | Google Workspace | Gmail, Drive, Sheets API access |
| **google-auth** | >= 2.35 | OAuth2 | Service account authentication for Google APIs |
| **httpx** | >= 0.28 | HTTP client | Async HTTP for Convex communication |
| **pydantic** | >= 2.10 | Data validation | Schema validation for agent state and tool definitions |
| **pydantic-settings** | >= 2.6 | Config management | Type-safe settings from `.env` files |

---

## Dev Tooling

| Technology | Role |
|---|---|
| **ESLint** (9) + **@convex-dev/eslint-plugin** | Linting with Convex-specific rules |
| **Prettier** (3.8) | Code formatting (printWidth: 120, singleQuote: true) |
| **npm-run-all2** | Parallel script execution (`dev:frontend` + `dev:backend`) |
| **bun** | Package manager / task runner (instead of npm/pnpm) |

---

## Data Source Integrations

| API | Scope | Used For |
|---|---|---|
| **Gmail API v1** | `gmail.readonly` | List and read email messages |
| **Google Drive API v3** | `drive.readonly` | List and download files |
| **Google Sheets API v4** | `spreadsheets.readonly` | Read spreadsheet data |

Connected via Google service account with OAuth2 delegation. All read-only — the platform never writes to client data sources.

---

## Environment Variables

### Frontend (`.env.local`)
- `VITE_CONVEX_URL` — Convex deployment URL
- `VITE_CONVEX_SITE_URL` — Convex HTTP endpoint base URL
- `VITE_WORKOS_CLIENT_ID` — WorkOS client ID
- `VITE_WORKOS_REDIRECT_URI` — Auth redirect URI

### Backend (Convex dashboard)
- `WORKOS_API_KEY` — WorkOS server key
- `AGENT_AUTH_TOKEN` — Bearer token for HTTP endpoints

### Agent Pipeline (`.env` in `agents/`)
- `ANTHROPIC_API_KEY` — Claude API key
- `GEMINI_API_KEY` — Gemini API key
- `GOOGLE_CREDENTIALS_JSON` — Path to Google service account JSON
- `CONVEX_SITE_URL` — Convex HTTP endpoint base URL
- `CONVEX_AGENT_TOKEN` — Same bearer token as backend
