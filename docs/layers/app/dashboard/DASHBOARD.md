# Dashboard Pages

> **Scope:** Next.js Server Components that compose module Client Components into dashboard routes.
> **Location:** `apps/web/app/dashboard/`

## Rules

1. Dashboard `page.tsx` files are Server Components. They fetch via server-side queries and render a module's Client wrapper.
2. No business logic in pages. Delegate to `packages/application/` use cases or to the module's `data/queries.ts`.
3. No Client-Component imports that call APIs directly. All client-side fetching goes through controllers in the module.
4. Route shape is per-module-type — see each type's `PATTERN.md` for the exact tree.

## Contract

A typical dashboard route:

```tsx
// apps/web/app/dashboard/{name}/page.tsx
import { requireSessionUser } from "@/server/auth/session"
import { listRecords } from "@/modules/{name}/data/queries"
import { ModuleClient } from "@/modules/{name}/components/list/{name}-client"

export default async function Page() {
  const user = await requireSessionUser()
  const records = await listRecords()
  return <ModuleClient initialRecords={records} />
}
```

The page's job is session/tool gating + server-side read + handing data to the Client Component. Nothing more.

## Anti-Patterns

1. **Do not** import `@builders/db` directly from a page. Use the module's `data/queries.ts` so the module controls what the page sees.
2. **Do not** call use cases (mutations) from a page. Dashboard pages are read-only entry points.
3. **Do not** embed filter, sort, or pagination logic in the page. That's the list controller's job.

## Related Docs

- [../api/API_DESIGN.md](../api/API_DESIGN.md) — sibling route layer for HTTP handlers
- [../../server/ROUTE_POLICY.md](../../server/ROUTE_POLICY.md) — server-side auth/tool gating
- [../../controller/CONTROLLER.md](../../controller/CONTROLLER.md) — controllers that Client Components consume
