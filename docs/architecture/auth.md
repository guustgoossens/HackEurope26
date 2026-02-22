# Authentication

Two separate auth systems: WorkOS for user identity, AGENT_AUTH_TOKEN for the agent pipeline.

---

## User Auth (WorkOS → Convex)

```
User → WorkOS AuthKit login
         │
         ▼
AuthKitProvider (React context, @workos-inc/authkit-react)
         │  provides: isLoading, user, getAccessToken
         ▼
ConvexProviderWithAuthKit  (src/ConvexProviderWithAuthKit.tsx)
         │  transforms WorkOS auth state → Convex-compatible auth object
         │  calls getAccessToken() → passes JWT to Convex
         ▼
ConvexProviderWithAuth → Convex backend validates JWT
         │  ctx.auth.getUserIdentity() → WorkOS user ID available in all queries
         ▼
Authenticated queries use createdBy: ctx.auth.getUserIdentity().subject
```

**Provider chain** (`src/main.tsx`):
```
ErrorBoundary → AuthKitProvider → ConvexProviderWithAuthKit → App
```

**Convex auth config** (`convex/auth.config.ts`):
```typescript
{
  providers: [{
    domain: WORKOS_ISSUER_URL,
    applicationID: WORKOS_CLIENT_ID,
  }]
}
```

---

## Agent Auth (Bearer Token)

Agents communicate with Convex over HTTP, not the Convex client SDK. Authentication is a shared bearer token:

```
Python agent → POST /api/agent/event
  Authorization: Bearer {CONVEX_AGENT_TOKEN}
         │
         ▼
convex/http.ts validates:
  req.headers.get('authorization') === `Bearer ${process.env.AGENT_AUTH_TOKEN}`
         │
         ▼
Calls internal Convex mutation (not exposed to frontend)
```

**Environment variables:**
- Backend (Convex dashboard): `AGENT_AUTH_TOKEN`
- Agent pipeline (`agents/.env`): `CONVEX_AGENT_TOKEN` (same value)

---

## What WorkOS Gives Us

WorkOS AuthKit was chosen over Clerk/Auth0 for:
- Enterprise SSO/directory sync out of the box (relevant for B2B accounting firm market)
- First-class Convex JWT integration
- The `convex-react-vite-authkit` starter template gave a working auth setup immediately

See [decisions/DECISIONS.md](../decisions/DECISIONS.md) — WorkOS section for full rationale.
