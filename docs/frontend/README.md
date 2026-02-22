# Frontend

React 19 + Vite 7 + Tailwind CSS 4. Path alias `@/` → `./src/`.

---

## Sub-Docs

| Doc | What |
|-----|------|
| [routing.md](./routing.md) | Page state management, ClientDetail phase→panel mapping |
| [components.md](./components.md) | All components with props and Convex hooks |

---

## Stack

| Tech | Version | Role |
|------|---------|------|
| React | 19 | UI framework |
| Vite | 7 | Build tool / dev server |
| Tailwind CSS | 4 | Utility-first styling |
| TypeScript | 5.9 | Strict mode |
| Lucide React | 0.575 | Icons |

## Key Files

```
src/
├── main.tsx                         # Provider chain: ErrorBoundary → AuthKit → Convex → App
├── App.tsx                          # Page state + routing
├── ConvexProviderWithAuthKit.tsx    # WorkOS ↔ Convex auth bridge
├── pages/
│   ├── Dashboard.tsx                # Client list + create
│   └── ClientDetail.tsx             # Phase-aware client view
└── components/                      # Reusable UI components
```
