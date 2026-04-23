# Dashboard Loaders

## Purpose

Dashboard loaders are the Server Components under `apps/web/app/dashboard/…/page.tsx` that resolve a URL into the data a Client Component needs to render. They are the server-side boundary for dashboard views — the counterpart to API routes, but for HTML delivery rather than JSON. They enforce access, read from the module's `data/queries.ts`, parse query state, and hand the result to a Client Component.

## Location and naming

- List pages: `apps/web/app/dashboard/<module>/page.tsx`.
- Detail pages: `apps/web/app/dashboard/<module>/[id]/page.tsx`.
- Create pages: `apps/web/app/dashboard/<module>/new/page.tsx`.
- No separate `loader.ts` file; data-loading logic lives inline in the page's `async` function.

## Loader pipeline

Every dashboard page follows the same shape:

1. **Access guard** — `await require<Module>Access()` (or `requireToolAccess("<slug>")`) returns the user or a 401/403 response. Run before any data fetch.
2. **Params + search params** — both are `Promise`-typed in Next.js 15+; `await` them.
3. **Query state parse** — `parseServerTableQueryState(searchParams, { defaultAscending, defaultGrouped, allowedGroupKeys, … })` for list pages.
4. **Fetch** — call the module's `data/queries.ts` function directly: `getContactsPageData()`, `getManufacturerDetailPageData(id)`. Loaders may call `queries.ts`; they never call `mutations.ts`.
5. **Result handling** — queries return a discriminated union:
   - `PrismaPageDataResult<T>` = `{ ok: true; data: T } | { ok: false; error: PageError } | { ok: false; notFound: true }`.
   - `PrismaDetailPageResult<T>` — same shape for single records.
   - On `notFound`, call Next.js `notFound()`. On `error`, render `<DashboardErrorState … />`.
6. **Pass to client** — hand the unwrapped record/array to the Client Component as typed props.

## Props passed to the client

- List pages: full record arrays as `initialContacts: ContactRow[]` (no DTO layer).
- Detail pages: full record as `contact: ContactDetail` or `manufacturer: ManufacturerRow`.
- Table metadata: `initialTablePreferences` (from `getResolvedUserTablePreference`) and `tableState` (from `parseServerTableQueryState`).
- Return-to links: `resolveReturnTo(searchParams?.returnTo, "/dashboard/<module>")`.

## Query state

- **Server side**: `parseServerTableQueryState` reads `searchQuery`, `isAscendingSort`, `isGroupingEnabled`, `groupByKeys` from the URL.
- **Client side**: `useConfiguredTableState` merges server state with the user's saved preferences; columns declare `sortField` + `groupable`.
- Pagination is client-managed (no server-side cursor in the reference modules).

## Error and loading UX

- Error surface: `<DashboardErrorState title message detail errorCode />` rendered from the page when `!result.ok`.
- 404s: Next.js `notFound()` — no custom 404 rendering in the page.
- No explicit `<Suspense>` boundaries in the reference modules; data is `await`ed at the top of the page.
- Client-side form feedback: `useRecordNotices()` on the client, not the loader.

## Violations checklist

- [ ] Page imports from `@/modules/<module>/data/mutations` (loaders only read).
- [ ] Page calls Prisma directly instead of going through `data/queries.ts`.
- [ ] Page body is `"use client"` — dashboard pages must be Server Components.
- [ ] Access guard (`require<Module>Access` / `requireToolAccess`) missing or placed after a data fetch.
- [ ] `params` / `searchParams` used without `await` (Next.js 15+ requires awaiting).
- [ ] Discriminated-union result handled with a truthy check (`if (result.data)`) instead of `if (!result.ok)` — masks the `notFound` + `error` branches.
- [ ] `notFound()` not called when the query returns `notFound: true`.
- [ ] `<DashboardErrorState>` skipped; errors surfaced as thrown exceptions.
- [ ] List page parses query state manually instead of using `parseServerTableQueryState`.
- [ ] DTOs or custom reshaping performed in the loader; client should receive the same row shape as the query returns.
- [ ] Client-only concerns (notices, form state) initialized in the loader rather than in the Client Component.
- [ ] Loader file placed outside `apps/web/app/dashboard/<module>/…` (e.g. mixed into `app/api/…`).
