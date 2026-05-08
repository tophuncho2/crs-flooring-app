## Routing — under `apps/web/app/api/`

Routes live outside the module folder, under `apps/web/app/api/{module}/`. 
[ ] Each route handler calls exactly one use case from `packages/application/` (or one repository read) —
 no business logic in route handlers.
 Every mutation goes through the canonical gauntlet (`applyRoutePolicy`, `parseMutationEnvelope`, `enforceMutationReceipt`, `finalizeMutationReceipt`, `withMutationTelemetry`). 
 Validators colocate in `_validators.ts`.

### Module-level routes

```
apps/web/app/api/{module}/
├── _validators.ts                       — per-module input validators
├── route.ts                             — GET list + POST create
├── options/route.ts                     — GET form options (powers components/picker/)
└── {action}/route.ts                    — optional: module-scoped action route (e.g. POST /from-template)
```

### Section-diff routes (atomic per record section)

```
apps/web/app/api/{module}/[id]/
├── route.ts                             — GET detail + DELETE record
├── primary/section/route.ts             — PATCH primary section
└── {child-section}/section/route.ts     — PATCH atomic diff for the section
```

Each `section/route.ts` accepts the section's diff (added/updated/removed) and applies it in one transaction. This is the canonical pattern for sections whose state is reconciled as a single atomic diff (e.g. primary fields, material items).

### Per-row sync routes (canonical for new per-row mutations)

For sections that mutate **one row at a time** synchronously (no worker, no outbox), the canonical shape is one folder per child collection with per-row + sub-action route files:

```
apps/web/app/api/{module}/[id]/{collection}/
├── route.ts                                   — POST create one row
├── {action}/route.ts                          — POST collection-scoped action (e.g. /finalize)
└── [{rowId}]/
    ├── route.ts                               — PATCH update / DELETE one row
    └── {action}/route.ts                      — POST per-row action (e.g. /void)
```

Each handler calls one use case, takes the necessary `FOR UPDATE` lock, and returns 200 with the post-mutation row + recomputed parent totals. The section controller patches local state from the response without a refetch.

### Sub-resource routes (per-row reads / scoped helpers)

```
apps/web/app/api/{module}/[id]/{collection}/[{rowId}]/{action}/route.ts   — e.g. GET /download (signed URL)
apps/web/app/api/{module}/[id]/{collection}/[{rowId}]/{scope}/route.ts    — e.g. GET /eligible-inventory
```

Used for read-only helpers scoped to a specific row (signed download URLs, eligibility lookups, etc.).

## Loaders — `apps/web/app/dashboard/{module}/`

Dashboard pages are SSR-only React Server Components that load data on the server and hand it to a module client component. They contain no business logic.

- [ ] **Location** — three canonical page shapes: `dashboard/{module}/page.tsx` (list), `dashboard/{module}/[id]/page.tsx` (record detail), `dashboard/{module}/new/page.tsx` (create flow).
- [ ] **Auth check is the first await** — every loader starts with `await requireToolAccess("{tool}")` from `@/server/auth/session`. Pages that bypass this are a bug.
- [ ] **Imports from `data/` only, never from `@builders/db` directly** — list pages import `parse{X}ListInputFromSearchParams` + the query key from `modules/{module}/data/list-{module}-request.ts`; detail pages import `get{X}DetailPageData` from `modules/{module}/data/queries.ts`. Use cases (`@builders/application`) may also be called for prefetch.
- [ ] **List page: prefetch + hydrate** — build a `QueryClient`, `prefetchQuery({ queryKey: [...QUERY_KEY, input], queryFn: () => list{X}UseCase(input) })`, then render the module client wrapped in `<HydrationBoundary state={dehydrate(queryClient)}>` so react-query starts hot on the client.
- [ ] **Detail page: `PrismaDetailPageResult` branch handling** — call `get{X}DetailPageData(id)` and switch on the result: `notFound` → `notFound()` from `next/navigation`; `error` → `<DashboardErrorState>`; `ok` → render `<{X}DetailClient initial...={result.data...} />`.
- [ ] **Errors render via `<DashboardErrorState>`** — passes `title`, `message`, `detail`, and a stable `errorCode` (e.g. `WORK_ORDERS_LIST_LOAD_FAILED`). Loaders never throw to the framework error boundary directly.
- [ ] **Search params + route params are Promises** — Next 15 makes them async. Always `await searchParams` / `await params` before reading; type them as `Promise<...>` in the page props.
- [ ] **Back-navigation via `resolveRecordEntryReturnTo`** — detail and create pages thread `searchParams?.returnTo` through `resolveRecordEntryReturnTo(...)` (from `@/hooks/navigation`) to derive `backHref` for the record entry chrome.
- [ ] **No client state, no HTTP, no Prisma** — loaders are pure SSR composition: auth → param parsing → data load → render. Anything stateful belongs in the module client component.
