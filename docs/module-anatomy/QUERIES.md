# Module Queries — `data/queries.ts`

> **Scope:** The role of `apps/web/modules/{name}/data/queries.ts` across every module type.

## What it is

A thin wrapper around `@builders/db` read functions that adds `withPrismaConnectivityHandling`. Every swept module ships a `data/queries.ts` with one entry per dashboard-page read:

- List entry (`get{Name}PageData`) for `dashboard/{name}/page.tsx`
- Detail entry (`get{Name}DetailPageData`) for `dashboard/{name}/[id]/page.tsx` (when the module has a detail view)

Example (`apps/web/modules/categories/data/queries.ts`):

```ts
import { listCategories, withPrismaConnectivityHandling } from "@builders/db"

export async function getCategoriesPageData() {
  return withPrismaConnectivityHandling(async () => listCategories())
}
```

## Return contract

`withPrismaConnectivityHandling` produces a `PrismaPageDataResult<T>` — a discriminated union:

```ts
| { ok: true;  data: T }
| { ok: false; error: { title, message, detail, code } }
```

Detail reads use `PrismaDetailPageResult<T>`, which adds a "not found" branch on top of the same shape.

## Who uses it

- **Dashboard pages only.** `page.tsx` files (list and `[id]`) are Server Components; if they throw, Next.js renders a generic error boundary. Wrapping the read lets the page render `<DashboardErrorState … />` from the error branch instead.

## Who does NOT use it

- **API routes.** Route handlers already have a `try { … } catch (error) { return routeError(access, error) }` path that maps Prisma error codes to HTTP status codes (P2002 → 409, P2025 → 404, etc.). Running the read through `withPrismaConnectivityHandling` on top of that would duplicate the error handling. Routes import the db reader directly from `@builders/db`.
- **Controllers / UI.** Client-side code never touches `data/queries.ts` — it runs on the server only. Client reads happen via the `/api/{name}` route or via props handed down from a Server Component.
- **Use cases.** Application-layer code calls `@builders/db` directly; it owns its own transaction and error semantics.

## Rules

1. `data/queries.ts` is a wrapper, not a data layer. It has no business logic, no transforms, no branching beyond what the Prisma helper provides.
2. Every function that feeds a dashboard page goes through `withPrismaConnectivityHandling`. No raw `@builders/db` calls from `page.tsx`.
3. Client code never imports from `data/queries.ts`. It's a server-only surface.
4. If a page needs data from multiple readers, compose them inside one `data/queries.ts` function so the page still awaits one result.

## Anti-patterns

1. **Do not** import `data/queries.ts` from a route handler or a client component.
2. **Do not** add business logic or mapping to `data/queries.ts`. Put mapping in `@builders/db` normalizers, or in the module's UI/controller where presentation-specific.
3. **Do not** catch errors inside `data/queries.ts`. `withPrismaConnectivityHandling` owns that.
