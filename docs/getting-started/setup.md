# Environment Setup

All environment variables and external service configuration.

---

## Frontend (`.env.local` in project root)

```env
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CONVEX_SITE_URL=https://your-deployment.convex.site
VITE_WORKOS_CLIENT_ID=client_...
VITE_WORKOS_REDIRECT_URI=http://localhost:5173/callback
VITE_AGENT_SERVER_URL=http://localhost:8000   # Python agent HTTP server
```

---

## Backend (Convex Dashboard → Settings → Environment Variables)

```
WORKOS_API_KEY=sk_...          # WorkOS server-side key
AGENT_AUTH_TOKEN=<secret>      # Bearer token for HTTP agent endpoints (any random secret)
CONVEX_DEPLOYMENT=<name>       # Set automatically by Convex CLI
```

---

## Agent Pipeline (`agents/.env`)

```env
# LLMs
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...

# Convex HTTP bridge
CONVEX_SITE_URL=https://your-deployment.convex.site
CONVEX_AGENT_TOKEN=<same value as AGENT_AUTH_TOKEN above>

# Google Workspace (direct OAuth — used when Composio is NOT active)
GOOGLE_CREDENTIALS_JSON=/path/to/service-account.json

# Composio (used when Composio IS active)
COMPOSIO_API_KEY=...
```

---

## Google Workspace Setup

**Option A: Composio (recommended for multi-user)**

1. Create a Composio account at composio.dev
2. Add the Gmail, Google Drive, and Google Sheets toolkits
3. Set `COMPOSIO_API_KEY` in `agents/.env`
4. Each user connects their Google account via the OAuth flow in the app
5. Composio handles auth per user — no service account needed

Note: Composio integration is currently being debugged (see [agent-pipeline/composio.md](../agent-pipeline/composio.md)).

**Option B: Service Account (simpler for single-user / demo)**

1. Create a Google Cloud project
2. Enable Gmail API, Drive API, Sheets API
3. Create a service account with domain-wide delegation
4. Download the JSON credentials
5. Set `GOOGLE_CREDENTIALS_JSON` to the path
6. Leave `COMPOSIO_API_KEY` unset — `MasterAgent` falls back to `GoogleWorkspaceClient`

---

## WorkOS Setup

1. Create a WorkOS account
2. Create an application in WorkOS dashboard
3. Set redirect URI to `http://localhost:5173/callback` (or your deployed URL)
4. Copy `Client ID` → `VITE_WORKOS_CLIENT_ID`
5. Copy `API Key` → `WORKOS_API_KEY` (Convex dashboard)

---

## Convex Setup

```bash
npx convex dev    # or: bun run dev:backend
```

First run will ask you to log in and create a deployment. The CLI sets `CONVEX_DEPLOYMENT` automatically.

After setup, copy the deployment URL and site URL to your `.env.local`.

---

## Python Agent Setup

```bash
cd agents
uv sync                           # install dependencies
cp .env.example .env              # create env file
# fill in .env with the values above
uv run python -m agents.main --client-id <id>  # run pipeline
```

Python >= 3.12 required.
