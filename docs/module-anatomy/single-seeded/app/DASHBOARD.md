# Single-Seeded — App / Dashboard

> How single-seeded modules wire up `apps/web/app/dashboard/{name}/`. Reference implementation: `categories`.

## Structure

```
apps/web/app/dashboard/{name}/
└── page.tsx                                 ← List page only
```

No `[id]/page.tsx`. No `new/page.tsx`. Reference data has no record or create view.

## Page shape

`page.tsx` is an async Server Component. Six moving parts:

1. **Tool gate** — `await require{Name}Access()` (e.g. `requireCategoriesAccess`). Resolves the session user; blocks access if the tool isn't granted.
2. **Search params** — `const resolvedSearchParams = searchParams ? await searchParams : undefined`. The Next.js `searchParams` prop is a Promise.
3. **Table preferences** — `await getResolvedUserTablePreference(user.id, "{table-key}")` from `@builders/application`. Persists sort / filter / grouping across sessions.
4. **Table state** — `parseServerTableQueryState({ searchParams, defaultAscending: … })` from `@/server/pagination`. Default ascending flips to preference direction when a saved pref exists.
5. **Page data** — `await get{Name}PageData()` from the module's `data/queries.ts`. Returns a `PrismaPageDataResult<Row[]>` (ok / error discriminated union). The page uses `data/queries.ts` — not a direct `@builders/db` call — because the query wraps the reader in `withPrismaConnectivityHandling`, converting connection failures into a renderable error shape instead of a thrown exception. See [`../../QUERIES.md`](../../QUERIES.md).
6. **Render** — on `pageData.ok === false`, return `<DashboardErrorState … />`. Otherwise pass `initial{Name}s`, `initialTablePreferences`, and `tableState` into the module's list client.

## Imports (canonical set)

- `DashboardErrorState` from `@/modules/app-shell/components/dashboard-error-state`
- `require{Name}Access` from `@/modules/shared/access/lookup-domains`
- `{Name}Client` from `@/modules/{name}/components/list/{name}-client`
- `get{Name}PageData` from `@/modules/{name}/data/queries`
- `getResolvedUserTablePreference` from `@builders/application`
- `parseServerTableQueryState` from `@/server/pagination`

No `@builders/db` import in the page. The module's `data/queries.ts` owns that boundary.

## Props handed to the client

- `initial{Name}s` — array of rows from `pageData.data`.
- `initialTablePreferences` — resolved preference payload.
- `tableState` — parsed query-state to seed sort/filter/pagination from the URL.

## Anti-patterns

1. **Do not** import `@builders/db` directly in the page. Go through `data/queries.ts`.
2. **Do not** call a use case (mutation) from a dashboard page. Reference data has no mutation path.
3. **Do not** skip the tool gate. Every dashboard entry starts with `require{Name}Access()`.
4. **Do not** render a create button, row-click handler, or detail route. Reference data is list-only.
