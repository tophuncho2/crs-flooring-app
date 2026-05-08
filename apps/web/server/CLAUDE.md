# Server Directory

Execution engine infrastructure, auth, platform utilities.

## Rules

1. `server/http/route-policy.ts` is the canonical entry point — all route protection flows through `applyRoutePolicy()`.
2. `server/auth/` handles authentication (NextAuth) and authorization (flat role model, `hasCapability()`).
3. `server/platform/` contains rate limiting, logging, and request context utilities.
4. No business logic lives here — this is execution engine infrastructure only.
5. No UI imports, no React, no client-side code.
6. Refer to `docs/execution-patterns/EXECUTION_ENGINE.md` for the 9-step sequence this directory enforces.
