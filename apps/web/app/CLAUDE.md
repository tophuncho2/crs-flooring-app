# App Directory

Next.js App Router pages and API routes.

## Rules

1. `page.tsx` files are Server Components — they call `requireSessionUser()`, fetch initial data, and pass props to client wrappers.
2. API routes live in `app/api/{name}/` and follow the standard route structure.
3. Every API route uses `applyRoutePolicy()` as its entry point (except auth handler routes).
4. Every mutation route (POST/PATCH/DELETE) uses the full mutation lifecycle: `parseMutationEnvelope` → `enforceMutationReceipt` → execute → `finalizeMutationReceipt`.
5. Query routes use `enforceQueryRateLimit()`.
6. No business logic in route handlers — delegate to `packages/application/` use cases.
7. Refer to `docs/layers/server/ROUTE_POLICY.md` and `docs/patterns/API_DESIGN.md` for full contracts.