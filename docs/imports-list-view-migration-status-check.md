# Imports List-View Migration — Status Check

**Date:** 2026-04-28. **Branch:** `staging` (clean apart from one unrelated docs delete).
**Driving docs read:** `imports-list-view-migration-intent.md`, `imports-list-view-migration-progress.md`, `imports-list-view-migration-plan-pr-4-6.md`.

---

## TL;DR

PRs 1–3 are fully landed and the codebase matches what the progress log claims. **The list view is server-driven via React Query, URL state is owned by `nuqs`, and the imports list-view path has zero engine imports.**

PRs 4–6 are **not started.** Specifically: `SearchDropdown` is still the original client-side-filter component (no `searchFn`, no React Query), there is no `/api/imports/dropdown-search` route, no `searchImportsForDropdownUseCase`, no `useMutation`-wrapped invalidation in `use-imports-list-controller.ts`, and no `docs/architecture/list-view-canonical-pattern.md`.

That second bullet is what blocks the user-visible "list refreshes when a worker finishes / when a mutation lands" behavior. **PR 5 is the one to do next** to satisfy the current ask.

---

## Headline counts

- Engine imports remaining in imports list-view path: **0** (`apps/web/modules/imports/components/list/*` and `apps/web/modules/imports/data/mutations.ts`).
- Engine imports still present in imports record-view path (out of scope per intent): yes — `controllers/use-import-{primary,staged-inventory-rows}-section.ts`, `data/queries.ts` (uses `withLoaderTiming`), and `controllers/use-imports-list-controller.ts` (uses `useRecordEntryNavigation`).
- New homes in place: **5/5** — `apps/web/transport/`, `apps/web/controllers/list-view/`, `apps/web/components/features/{search,sort,group,paginate}/`, `packages/application/src/list-view/contracts.ts`, `apps/web/app/providers.tsx`.
- nuqs URL params bound by the fetch controller: **5** — `q`, `sort`, `grouped`, `groups`, `page`.
- React Query: globally provided in `apps/web/app/layout.tsx → <AppProviders>` with `staleTime: 30s` and `refetchOnWindowFocus: true`.

---

## What's actually in the codebase

### PR 1 — Foundations ✅ shipped

| Artifact | Path | Status |
|---|---|---|
| Transport home | `apps/web/transport/{http,mutation,client-errors,index}.ts` | ✅ |
| Providers | `apps/web/app/providers.tsx` (`<NuqsAdapter>` + `<QueryClientProvider>`) | ✅ |
| Layout wiring | `apps/web/app/layout.tsx` wraps `<AppProviders>` | ✅ |
| Controller home | `apps/web/controllers/list-view/{use-server-list-controller, contracts/, url-bindings/, table-preferences-client, index}.ts` | ✅ |
| Shared contract | `packages/application/src/list-view/contracts.ts` exports `ListInput`, `ListOutput`, `ListGroup`, `ListSort`, `SortDirection` | ✅ |
| Feature controls | `apps/web/components/features/{search,sort,group,paginate}/` | ✅ scaffolds present |

### PR 2 — Imports adopts `useServerListController` (SSR mode) ✅ shipped

`imports-client.tsx` imports `useServerListController` from `@/controllers/list-view`. No `useConfiguredTableState`. Module-local sort/group allowlists declared as `IMPORTS_ALLOWED_SORT_FIELDS` / `IMPORTS_ALLOWED_GROUP_FIELDS`.

### PR 3 — Server-driven fetch mode ✅ shipped

| Artifact | Path | Status |
|---|---|---|
| Use case | `packages/application/src/flooring/imports/list-imports.ts` (`listImportsUseCase`, `LIST_IMPORTS_PAGE_SIZE`, etc. — constants live in `packages/domain/src/flooring/imports/list-config.ts` per the bug-fix commit) | ✅ |
| Repo function | `packages/db/src/flooring/imports/read-repository.ts → listImportsForListView()` | ✅ (orphaned `listImports()` left in place per intent — flagged) |
| Zod query validator | `apps/web/app/api/imports/_validators.ts → validateListImportsQuery()` | ✅ |
| GET route | `apps/web/app/api/imports/route.ts` delegates to `listImportsUseCase` | ✅ |
| Typed fetch wrapper | `apps/web/modules/imports/data/list-imports-request.ts` (`listImportsRequest`, `parseImportsListInputFromSearchParams`, `IMPORTS_LIST_QUERY_KEY`) | ✅ |
| Page shell | `apps/web/app/dashboard/imports/page.tsx` (server prefetch + `<HydrationBoundary>`, `IMPORTS_FALLBACK_PREFERENCES`) | ✅ |
| Client | `imports-client.tsx` runs `mode: "fetch"` | ✅ |
| `data/queries.ts` cleanup | List loaders deleted (record-view loaders remain, expected) | ✅ |

The fetch-mode controller binds five nuqs query state hooks (`q` / `sort` / `grouped` / `groups` / `page`), debounces search at 300 ms before writing the URL, and uses React Query's `placeholderData: previous` for stale-while-fetching. Table-preferences PATCH still fires on sort/group changes via `patchTablePreference`.

### PR 4 — Async dropdown primitive ❌ not started

- `apps/web/components/dropdowns/search-dropdown.tsx` is the **original** client-side substring filter. No `searchFn` prop. No `useQuery`. No debounce.
- `apps/web/app/api/imports/dropdown-search/route.ts` does **not** exist.
- `packages/application/src/flooring/imports/search-imports-for-dropdown.ts` does **not** exist.

### PR 5 — Mutation invalidation ❌ not started

- `apps/web/modules/imports/controllers/use-imports-list-controller.ts` exposes `message` / `pageError` / `openCreate` / `openImport` only. **No** `useMutation`, **no** `invalidateQueries`, **no** wiring of `setMessage` / `setPageError` against mutation success / failure.
- `apps/web/modules/imports/data/mutations.ts` (`createImportRequest`, `updateImportRequest`, `deleteImportRequest`, `updateImportStagedInventoryRowsRequest`, `markStagedRowsForImportRequest`) are correct shape but get called from **record-view controllers**, not from the list controller — so even when they succeed, the imports list query is never invalidated.
- The user-facing consequence: after creating/editing/deleting an import or marking staged rows for import, the imports list does not auto-refresh on return. The user reloads.
- The one piece that already works for free: `refetchOnWindowFocus: true` in `<AppProviders>` — tabbing back to the list will refetch after `staleTime: 30s`.

### PR 6 — Canonical pattern doc ❌ not started

`docs/architecture/list-view-canonical-pattern.md` does not exist. Existing `docs/architecture/` contents: `CLAUDE.md`, `directories/`, `quick-promtpts/`, `route-utilities/`.

---

## Gaps & flags found while auditing

1. **No group-by UI control on the imports list.** `useServerListController` exposes `onGroupFieldChange` and the URL/preferences plumbing is wired end-to-end (`grouped` + `groups` params, allowlist `["warehouse", "manufacturer"]`), but `imports-client.tsx` only renders `SearchControl` + `SortToggle` + `ImportsTable` — there is no `GroupControl` consumer. So group state is settable via URL / saved preferences only, not via the toolbar. Worth noting because `apps/web/components/features/group/` ships only `group-tree.tsx` (a renderer for grouped rows) — there's no `GroupControl`-style toggle primitive yet to drop in.

2. **`groups` output ignored.** `ListOutput<TRow>.groups` is populated by the contract but the imports list never displays it. Per intent this is by design (imports doesn't sum), but worth flagging that `GroupTree` is not rendered today.

3. **Worker completion ↔ list refresh.** The user's ask mentions "page refreshes when workers are done." The progress doc explicitly defers list-level polling because the only async outbox flow on imports today (`mark-for-import` via `markStagedRowsForImportRequest`) lives on the **record-detail** page, not on the list. If the requirement is "list reflects post-worker state," then either (a) PR 5's mutation invalidation is enough on its own (worker finishes → user navigates back to list → list refetches because focus returned + stale), or (b) a list-level polling extension is needed (intent's Phase 5 originally proposed extending `usePendingWorkflowPolling` to list scope). PR 5 as written goes with option (a). Option (b) is open work not currently scoped.

4. **Orphaned engine code (intent-flagged, deferred).**
    - `listImports()` in `packages/db/src/flooring/imports/read-repository.ts` — orphaned but harmless.
    - `engines/common/transport/{http,mutation,client-errors}.ts` — engine versions still present alongside `apps/web/transport/*` (kept while other modules still import them).
    - `engines/list-view/controllers/table-preference-client.ts` — engine version retained for the same reason.

5. **One doc delete in working tree.** `docs/cut-log-follow-ups-from-sweep-7.md` shows as deleted in `git status` — unrelated to imports migration; not committed.

---

## Recommendation: what to do next

The user's stated goal — "page refreshes when workers are done, etc." — maps cleanly onto **PR 5**. Suggested order:

1. **PR 5 (mutation invalidation) first.** Wrap the imports mutations in `useMutation` inside `use-imports-list-controller.ts` (or in the record-view section controllers that own them, with the list query key passed in). On success: `queryClient.invalidateQueries({ queryKey: IMPORTS_LIST_QUERY_KEY })` and set `message` for the success banner that's already rendered in `imports-client.tsx`. This delivers the user-visible refresh behavior with no design questions left over.

2. **Then PR 4 (SearchDropdown async)** — primitive-only ship if the audit (per the plan doc) confirms no current imports flow needs async. The primitive sits ready for inventory adoption.

3. **Then PR 6 (canonical-pattern doc)** — once PRs 4 and 5 are in, write the doc against shipped code (no path drift).

If the user wants the list to refresh **specifically when a `mark-for-import` worker completes** (not just when its triggering POST returns 202), that's the deferred polling work — flag explicitly before starting.

---

## Verification commands run

```bash
git log --oneline -30                 # last commits: 4e985dc8 "bug fix", 54d68ff4 "pr 3"
git status                            # only docs/cut-log-follow-ups-from-sweep-7.md deleted
ls apps/web/transport/                # http.ts, mutation.ts, client-errors.ts, index.ts
ls apps/web/controllers/list-view/    # use-server-list-controller.ts, contracts/, url-bindings/, table-preferences-client.ts, index.ts
ls apps/web/components/features/      # group, paginate, search, sort
ls packages/application/src/list-view/  # contracts.ts, index.ts
ls packages/application/src/flooring/imports/  # list-imports.ts present
find apps/web/app/api/imports -type f  # no dropdown-search/route.ts
grep -n listImportsForListView packages/db/src/flooring/imports/read-repository.ts  # line 172
grep -rn "invalidateQueries\|useMutation" apps/web/modules/imports/  # zero hits
ls docs/architecture/                  # no list-view-canonical-pattern.md
```
