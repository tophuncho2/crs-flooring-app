# Imports List-View Migration — Progress (PRs 1–3)

**Sweep started:** 2026-04-27. **Status as of this report:** PRs 1, 2, 3 complete and verified on dev server. PRs 4–6 outlined in the companion forward plan.

**Driving doc:** [docs/imports-list-view-migration-intent.md](imports-list-view-migration-intent.md). This file is the execution log against that intent.

---

## Scope recap

The intent: migrate `apps/web/modules/imports/` (list view only) off `apps/web/modules/shared/engines/`, stand up the canonical pattern other modules will follow (transport home, controller home, list-view contract, async dropdown primitive), and refresh the list automatically on mutation.

**Out of scope by design:** record-view migration in imports, inventory/work-orders/templates/etc. list views, deletion of any engine code, realtime push.

---

## PR 1 — Foundations (deps + scaffolds + provider)

**Goal:** stand up the new top-level homes; no consumer changes; engine untouched.

**Deps installed:**
- `@tanstack/react-query@5.100.5`
- `nuqs@2.8.9`

**New files:**
- `apps/web/transport/{http,mutation,client-errors,index}.ts` — re-homed from `engines/common/transport/*` (engine versions retained until other modules migrate).
- `apps/web/app/providers.tsx` — `<AppProviders>` wraps `<NuqsAdapter>` and `<QueryClientProvider>` (SSR-safe singleton, `staleTime: 30s`, `refetchOnWindowFocus: true`).
- `apps/web/controllers/list-view/use-server-list-controller.ts` (shell only — body lands in PR 2).
- `apps/web/controllers/list-view/contracts/list-controller-input.ts` and `list-controller-output.ts`.
- `apps/web/controllers/list-view/url-bindings/nuqs-bindings.ts`.
- `apps/web/controllers/list-view/index.ts`.
- `packages/application/src/list-view/contracts.ts` — `ListInput<TFilters>`, `ListOutput<TRow>`, `ListGroup`, `ListSort`, `SortDirection`. Top-level peer in the application package, not under `flooring/` (cross-module concept). Re-exported from `packages/application/src/index.ts`.

**Modified:**
- `apps/web/app/layout.tsx` — wraps children in `<AppProviders>`.
- `apps/web/controllers/CLAUDE.md` — admits `list-view/` and `dropdown-search/` as legitimate buckets that mirror `components/features/` and `components/dropdowns/`.

**Audit recorded (deltas to handle later):**
- `SearchControl`, `PaginateControls` — direct match with controller bindings, reusable as-is.
- `SortToggle` — needs consumer-side wrapper to bridge `onToggleSortDirection`. Light, lands in PR 2.
- `GroupTree` — renderer for grouped rows, separate concern.
- `SearchDropdown` (existing) — currently client-side filter only; needs `searchFn?` prop for async mode in PR 4.

**Verification:** typecheck 57 errors (matches baseline, zero new). Tests 18 failed (matches baseline). Dev server boots clean.

---

## PR 2 — Imports adopts `useServerListController` (SSR mode)

**Goal:** swap `useConfiguredTableState` for `useServerListController` with identical behavior. Still SSR-driven; no fetch yet.

**New file:**
- `apps/web/controllers/list-view/table-preferences-client.ts` — re-home of the engine `patchTablePreference`. Uses `withMutationMeta` from `@/transport/mutation`, `TablePreferencePayload` from `@builders/domain`. Engine version stays for other modules.

**Modified:**
- `apps/web/controllers/list-view/contracts/list-controller-input.ts` — added `tableKey`, `initialTablePreferences`, `pagination` (with `previousPageHref`/`nextPageHref`).
- `apps/web/controllers/list-view/contracts/list-controller-output.ts` — added `previousPageHref?`, `nextPageHref?`, `preferenceError`.
- `apps/web/controllers/list-view/use-server-list-controller.ts` — full SSR-mode body. URL writes via `replaceState` (or `router.replace` if `urlSyncMode: "router"`). 300 ms search debounce. 400 ms preferences debounce with module-level abort coordination. Single-field grouping per the contract. Throws on `mode: "fetch"` until PR 3 fills it.
- `apps/web/controllers/list-view/index.ts` — exports `patchTablePreference` and types.
- `apps/web/modules/imports/components/list/imports-client.tsx` — swapped to `useServerListController`. Drops engine `useConfiguredTableState` and engine `TablePreferencePayload` imports. `TablePreferencePayload` now sourced from `@builders/domain` directly. Allowed sort/group fields declared as module-local constants.
- `apps/web/modules/imports/data/mutations.ts` — `requestJson` and `withMutationMeta` now from `@/transport`.

**Out of scope (still on engine, by design):**
- `apps/web/modules/imports/components/record/*` — record-view scaffold.
- `apps/web/modules/imports/controllers/use-import-{primary,staged-inventory-rows}-section.ts` — record-view types.
- `apps/web/modules/imports/controllers/use-imports-list-controller.ts` — `useRecordEntryNavigation` (`engines/common/record-entry`).
- `apps/web/modules/imports/data/queries.ts` — still imports `withLoaderTiming` for record-view loaders.

**Verification:** zero engine imports in `imports/components/list` and `imports/data/mutations.ts`. Manual on dev: search/sort/group/paginate write URL identically to before, preferences PATCH still fires.

---

## PR 3 — Server-driven fetch mode

**Goal:** flip imports from "SSR re-render via navigation" to "fetch + React Query." Page becomes a thin shell. `mode: "fetch"` controller body lands.

**New files:**
- `packages/application/src/flooring/imports/list-imports.ts` — `listImportsUseCase(input: ListInput<ImportsListFilters>): Promise<ListOutput<ImportRow>>`. Validates allowlists (`allowedSortFields = ["importNumber"]`, `allowedGroupFields = ["warehouse", "manufacturer"]`, `pageSize ∈ [1, 200]`). Surface constants: `LIST_IMPORTS_PAGE_SIZE = 50`, `LIST_IMPORTS_MAX_PAGE_SIZE = 200`, `LIST_IMPORTS_ALLOWED_SORT_FIELDS`, `LIST_IMPORTS_ALLOWED_GROUP_FIELDS`.
- `apps/web/modules/imports/data/list-imports-request.ts` — typed fetch wrapper `listImportsRequest` (uses `requestJson` from `@/transport`), `parseImportsListInputFromSearchParams` (single source of truth for URL → ListInput, used by both server prefetch and route resolution), `IMPORTS_LIST_QUERY_KEY` constant.

**Modified:**
- `packages/db/src/flooring/imports/read-repository.ts` — added `listImportsForListView(options, client?)` returning `{ rows, total }`. Migrated the search-where (numeric `importNumber` match + multi-field text) and group-aware order-by (with stable `importNumber` tiebreak) from the old SSR loader. Existing `listImports()` left in place (orphaned but harmless; flagged for follow-up cleanup).
- `packages/application/src/flooring/imports/index.ts` — re-exports `list-imports.js`.
- `apps/web/app/api/imports/_validators.ts` — added Zod-backed `validateListImportsQuery(searchParams: URLSearchParams)`. Body validators (hand-rolled) untouched.
- `apps/web/app/api/imports/route.ts` — GET handler delegates to `listImportsUseCase`. Returns `{ rows, total }` per `ListOutput<ImportRow>` (breaking change to old `{ imports }` shape; no other consumers existed).
- `apps/web/controllers/list-view/use-server-list-controller.ts` — implemented `mode: "fetch"`. nuqs hooks for `q`/`sort`/`grouped`/`groups`/`page`. React Query `useQuery` keyed off the input shape. 300 ms search debounce on URL writes. `placeholderData: keepPreviousData` for stale-while-fetching UX. Table-preferences persistence wired the same way as SSR mode.
- `apps/web/modules/imports/components/list/imports-client.tsx` — flipped to `mode: "fetch"`. Drops `initialImports`, `tableState`, `pagination` props. Receives `initialSearchQuery`, `initialIsAscendingSort`, `initialGroupField`, `initialPage` from the page (computed server-side for queryKey alignment).
- `apps/web/app/dashboard/imports/page.tsx` — thin shell. Server prefetches via `listImportsUseCase` directly (no HTTP roundtrip; application package is server-safe), wraps client in `<HydrationBoundary>`. `IMPORTS_FALLBACK_PREFERENCES` used when user has no saved prefs (sort=asc, grouped by warehouse) — preserves today's first-load defaults.
- `apps/web/modules/imports/controllers/use-imports-list-controller.ts` — dropped dead `imports`/`setImports` local state and `initialImports` parameter. Kept `message`/`pageError` for PR 5 wiring.
- `apps/web/modules/imports/data/queries.ts` — deleted `getImportsPageData`, `loadImportsPageData`, `buildImportsSearchWhere`, `buildImportsOrderBy`. Direct Prisma access removed (CLAUDE.md violation gone). Record-view loaders untouched.
- `apps/web/tests/modules/imports/imports-client.test.tsx` — rewritten for fetch mode. Mocks `listImportsRequest`, wraps in `NuqsTestingAdapter` + `QueryClientProvider`. New 4th test asserts `listImportsRequest` is called with the right initial input.

**Behavior changes worth flagging:**
- Refetch on URL change is shallow (nuqs `replaceState`); no Next.js page navigation between query states.
- First paint is hydration-driven from `<HydrationBoundary>`; no flash of empty state.
- `grouped=0` URL flag is now honored explicitly (so "user turned grouping off" survives reload — doesn't fall back to prefs default).
- Search debounce 300 ms on URL writes, which is the refetch trigger.

**Decisions baked in this PR:**
- First paint: server-prefetch + `<HydrationBoundary>` (chosen over "skip prefetch + brief loading state").
- Zod for query validation in the route (introduces a new pattern — body validators stay hand-rolled; separate concern).
- `parseServerTableQueryState` from `@/server/pagination` left untouched (9 other modules still use it).
- `listImports()` in `@builders/db` left in place even though orphaned.

**Verification:**
- Typecheck 57 errors (matches baseline, zero new).
- Tests 18 failed (matches baseline) | 164 passed (+1 from new request-shape assertion). `imports-client.test.tsx` moved from 3 baseline failures → all 4 tests passing.
- `rg "modules/shared/engines" apps/web/modules/imports/components/list apps/web/modules/imports/data/mutations.ts` → zero hits.
- Dev server: clean boot, `GET /dashboard/imports` compiles + 307 auth redirect.

---

## Engine boundary state for `apps/web/modules/imports/`

| Path | Engine imports remaining | Reason |
|---|---|---|
| `components/list/imports-client.tsx` | **None** | List view, fully migrated. |
| `components/list/imports-table.tsx` | None | Already used `@/components/grid` and `@/components/features/paginate`. |
| `components/record/*` | Yes | Record-view scaffold — out of scope per intent. |
| `controllers/use-imports-list-controller.ts` | Yes | `useRecordEntryNavigation` from `engines/common/record-entry` — out of scope. |
| `controllers/use-import-primary-section.ts` | Yes | Record-view types — out of scope. |
| `controllers/use-import-staged-inventory-rows-section.ts` | Yes | Record-view types — out of scope. |
| `data/mutations.ts` | **None** | Switched to `@/transport`. |
| `data/queries.ts` | `withLoaderTiming` for record-view loaders only | List-view path deleted. |

**Net result:** the list-view code path in imports has zero engine dependencies. The remaining engine imports are all in record-view code paths and stay until that migration's own sweep.

---

## Cumulative verification across PR 1–3

- **Typecheck:** 57 errors — exact match to staging baseline. Confirmed via `git stash`/`pop` baseline comparison during PR 1.
- **Tests:** 18 failed (matches baseline) | 164 passed (+1 vs baseline). Imports-client tests moved from 3 failing → 4 passing.
- **Dev server:** clean boot through PR 1, 2, 3 (verified via HMR log + fresh boot).
- **Behavior parity:** URL writing on search/sort/group/paginate, table-preferences persistence, default sort/grouping load — all confirmed in user testing of PR 2.
- **Behavior gain:** server-prefetch + React Query refetch + URL-shallow updates — observed in PR 3 dev server compile, full UX still pending user manual smoke post-login.

---

## What's deferred (intent-out-of-scope, captured for the record)

1. `listImports()` in `@builders/db` — orphaned after PR 3. Cheap to leave; cleanup is a follow-up sweep.
2. `engines/list-view/controllers/table-preference-client.ts` — engine version stays in place; flagged for deletion in a follow-up sweep when no engine consumers remain.
3. `parseServerTableQueryState` and friends in `apps/web/server/pagination.ts` — 9 other dashboard pages still use it; stays until those modules migrate.
4. `engines/common/transport/{http,mutation,client-errors}.ts` — engine versions retained alongside `apps/web/transport/*` until other modules migrate to the new home.
5. Imports record-view migration (panels, primary section, staged rows) — explicitly out of scope per intent.
