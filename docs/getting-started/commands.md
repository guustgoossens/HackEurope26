# Commands Reference

## Frontend & Backend

```bash
bun install              # Install frontend dependencies
bun run dev              # Start frontend (Vite) + Convex backend in parallel
bun run dev:frontend     # Frontend only (Vite on localhost:5173)
bun run dev:backend      # Convex dev server only
bun run build            # TypeScript check + Vite production build
bun run lint             # TypeScript + ESLint
bun run format           # Prettier (printWidth: 120, singleQuote: true)
```

## Agent Pipeline

```bash
cd agents

uv sync                  # Install Python dependencies (creates .venv)

# Run pipeline for a client
uv run python -m agents.main --client-id <convex-client-id>

# Seed demo data
npx convex run seed:seedDemoData   # from project root
```

## Convex

```bash
npx convex dev           # Start Convex dev server (included in bun run dev)
npx convex deploy        # Deploy to production
npx convex run <function>  # Run a Convex function directly
```

## Git

The project uses `bun` not npm/pnpm. If you see `npm install` instructions anywhere, use `bun install` instead.
