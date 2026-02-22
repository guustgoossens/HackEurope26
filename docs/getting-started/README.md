# Getting Started

## Quick Start

```bash
# 1. Install frontend dependencies
bun install

# 2. Start frontend + Convex backend
bun run dev

# 3. Run the agent pipeline (separate terminal)
cd agents
uv run python -m agents.main --client-id <convex-client-id>
```

That's it. Frontend runs on `localhost:5173`. Convex dev server handles the backend.

---

## Setup Docs

| Doc | What |
|-----|------|
| [setup.md](./setup.md) | All environment variables, service accounts, Composio setup |
| [commands.md](./commands.md) | Full command reference for frontend and agent pipeline |
| [tech-stack.md](./tech-stack.md) | Every package with exact versions, model names, API scopes, why each was chosen |
