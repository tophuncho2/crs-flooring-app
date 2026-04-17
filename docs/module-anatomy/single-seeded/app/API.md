# Single-Seeded — App / API

> How single-seeded modules wire up `apps/web/app/api/{name}/`. Reference implementation: `categories`.

## Structure

```
apps/web/app/api/{name}/
└── route.ts                                 ← GET only
```

No mutation routes. No `[id]/route.ts`. No `_validators.ts`.

## Handler shape

One `GET` function per module. Four moving parts:

1. **Route policy** — `applyRoutePolicy(request, { capability: "system.access", toolSlug: {NAME}_TOOL_SLUG })`. `system.access` is the baseline capability; tool slug is imported from `@/modules/shared/access/lookup-domains`. Short-circuit if it returns a `Response`.
2. **Query rate limit** — `enforceQueryRateLimit(request, access, "/api/{name}")`. Short-circuit on throttle.
3. **Read + respond** — inside `try`, call the db list reader directly from `@builders/db` (e.g. `listCategories`) and return `routeJson(access, { {pluralName}: rows })`. The route does **not** call `modules/{name}/data/queries.ts` — that helper exists to wrap Prisma errors for the dashboard page; here, the route's own `catch → routeError` path already maps Prisma errors to HTTP status codes, so the wrapper would duplicate the work. See [`../../QUERIES.md`](../../QUERIES.md). The route does **not** call a use case — single-seeded reads have no rules to run.
4. **Error normalization** — `catch (error) { return routeError(access, error) }`.

## Imports (canonical set)

- `list{Name}s` from `@builders/db`
- `{NAME}_TOOL_SLUG` from `@/modules/shared/access/lookup-domains`
- `routeJson`, `routeError` from `@/server/http/route-helpers`
- `applyRoutePolicy`, `enforceQueryRateLimit` from `@/server/http/route-policy`

Nothing from `@builders/application`. Nothing from `@builders/domain`.

## Response shape

Resource-keyed plural envelope:

```
{ categories: Category[] }
```

No `{ data: ... }`, no wrapper envelopes. Matches `docs/layers/app/api/API_DESIGN.md` Rule 4.

## Anti-patterns

1. **Do not** add `POST`, `PATCH`, or `DELETE` — single-seeded rows are immutable at runtime.
2. **Do not** skip `enforceQueryRateLimit`. Every read route rate-limits.
3. **Do not** introduce an entity-specific capability (`categories.view` etc.). `system.access` + tool slug is the contract.
4. **Do not** import Prisma or `@prisma/client` directly — always go through `@builders/db`.
