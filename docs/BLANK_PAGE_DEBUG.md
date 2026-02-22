# Blank page at localhost:5173 — handoff for diagnostic

## Problem

- **Symptom:** At `http://localhost:5173` (and at `http://localhost:5173/demo`), the user sees a **blank, dark blue page**. No content, no error message.
- **Stack:** React + Vite + Convex + WorkOS AuthKit. Demo mode is intended to skip auth and show Landing at `/`, demo app at `/demo`.

## What was already tried (and did not fix it)

1. **Demo mode env**
   - Added `VITE_DEMO_SKIP_AUTH=true` in `.env.local` so the app uses `DemoApp` (Landing at `/`, demo at `/demo`) instead of the main `App` (which ignores the URL).
   - User was told to restart the dev server so Vite picks up the var. Still blank.

2. **Removing AuthKitProvider in demo mode**
   - In `src/main.tsx`, in the `demoSkipAuth` branch, `AuthKitProvider` was removed around `DemoApp` to avoid WorkOS possibly blocking render (loading/redirect) and leaving the screen blank.
   - Tree is now: `ConvexProvider` → `div[data-demo-mode]` → `DemoApp` → (at `/`) `Landing`.
   - Still blank.

3. **Landing visible on first paint**
   - In `src/pages/Landing.tsx`, `navVisible` was changed from `useState(false)` + `setTimeout(..., 100)` to `useState(true)` so the hero and nav are not hidden on first paint (no dependency on IntersectionObserver or delay).
   - Still blank.

4. **Dev server**
   - At some point `bun run dev` was run; `predev` (Convex) failed in a non-interactive terminal. Vite and Convex were started separately (`vite --open` and `convex dev`). User may be using a different process; unclear if server was restarted after env change.

## Hypotheses (not confirmed)

- **Env not loaded:** Dev server started before `VITE_DEMO_SKIP_AUTH` was added, so `demoSkipAuth` is still `false`. Then the app is the normal `App`; `AuthKitProvider` + `ConvexProviderWithAuthKit` might not render children until auth/Convex is “ready”, resulting in a blank screen.
- **ConvexProvider blocking:** Unlikely from docs, but ConvexProvider might not render children until connection is established.
- **Error before first paint:** A throw before or during `Landing` render could leave the page blank. `ErrorBoundary` in `main.tsx` would show a red box for caught errors; if nothing shows, either no error is thrown or the error happens before the boundary (e.g. in root or in a provider).
- **VITE_CONVEX_URL missing:** If `import.meta.env.VITE_CONVEX_URL` is undefined, `new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!)` might still build a client but cause later failure or weird behavior. `.env.local` contains `VITE_CONVEX_URL`; need to confirm it’s actually loaded by Vite (e.g. server restarted from project root).
- **SPA / routing:** No React Router; `DemoApp` uses `useState` + `window.location.pathname` and `pushState`/`popstate`. Direct load to `localhost:5173` or `localhost:5173/demo` should still serve `index.html` (Vite dev SPA fallback). So routing alone shouldn’t explain a fully blank page unless the app never mounts.

## Relevant code paths

- **Entry:** `src/main.tsx`
  - `demoSkipAuth = import.meta.env.VITE_DEMO_SKIP_AUTH === 'true'`
  - If true: `ConvexProvider` → `div[data-demo-mode]` → `DemoApp`
  - If false: `AuthKitProvider` → `ConvexProviderWithAuthKit` → `App`
- **DemoApp:** `src/DemoApp.tsx`
  - `path = window.location.pathname === '/demo' ? '/demo' : '/'`
  - If `path !== '/demo'`: renders `Landing` with `onSignIn={goToDemo}`.
  - If `path === '/demo'`: renders `DemoClientView` (Convex queries, then `DemoIndex` or loading states).
- **Landing:** `src/pages/Landing.tsx`
  - Root: `<div className="landing ...">` with light background via CSS vars (`.landing` in `src/index.css`). No Convex, no auth hooks.
- **ErrorBoundary:** `src/ErrorBoundary.tsx` — catches render errors and shows a red box with message. If the user sees nothing at all, either the error is outside the boundary or the tree never mounts.

## Suggested diagnostic steps for Claude Code

1. **Confirm env at runtime**
   - In `main.tsx` (or a tiny bootstrap component), log or expose `import.meta.env.VITE_DEMO_SKIP_AUTH` and `import.meta.env.VITE_CONVEX_URL` (e.g. `data-*` on root or a dev-only div) so we know which branch runs and if Convex URL is set.
2. **Confirm React mount**
   - Ensure `document.getElementById('root')` exists and that `createRoot(...).render(...)` runs. Optional: render a minimal div with text (e.g. “App mounted”) before `Root` to see if anything appears.
3. **Narrow down where render stops**
   - Temporarily replace `Root`’s return with a single div with text (“Demo branch” or “Non-demo branch”). If that shows, the issue is inside the provider or `DemoApp`/`Landing`. If it doesn’t, the issue is earlier (env, root, or error before Root).
4. **Check Console**
   - User should open DevTools → Console and report any red errors (and any 404s or failed requests in Network). That will tell if something throws or fails to load.
5. **Verify dev server and .env**
   - Ensure the process running Vite was started from `HackEurope26` (where `package.json` and `.env.local` live) and that the server was restarted after adding `VITE_DEMO_SKIP_AUTH`.
6. **Optional: minimal demo branch**
   - In the `demoSkipAuth` branch, try rendering only a plain `<div>Demo mode OK</div>` (no ConvexProvider, no DemoApp). If that appears, add back ConvexProvider, then DemoApp, then Landing to see which step makes the page go blank.

## Files touched in previous attempts

- `.env.local` — added `VITE_DEMO_SKIP_AUTH=true`
- `src/main.tsx` — removed `AuthKitProvider` in demo branch; added wrapper `div[data-demo-mode]`
- `src/DemoApp.tsx` — briefly added then removed a “Loading…” overlay
- `src/pages/Landing.tsx` — `navVisible` initial state `false` → `true`; removed the 100ms delay for nav visibility

## Linter / type issues (pre-existing, not fixed here)

- `Landing.tsx`: `SORTED_NODES`, `LandingGraph`, `gVis` referenced but not found; `LandingGraphEditorial`, `TOTAL`, `setNavVisible` unused. May need cleanup or missing imports.
