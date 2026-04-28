# Imports List-View — PR 5 Executed

**Date:** 2026-04-28. **Branch:** `staging`.
**Plan:** [imports-list-view-migration-plan-pr-5.md](imports-list-view-migration-plan-pr-5.md).

---

## TL;DR

Polling + mutation invalidation shipped end-to-end on imports. New peer directory `apps/web/query-policies/` exports `LIST_FRESHNESS_*` presets; imports list opts in to `LIST_FRESHNESS_STANDARD` (10s polling, 5s stale). Shared hook `useImportsListMutations()` wraps all 5 imports mutations in `useMutation` and invalidates `IMPORTS_LIST_QUERY_KEY` on success — wired into both record-view section controllers and the list controller.

**Headlines / counts**
- Files created: **3**
- Files modified: **6**
- Mutations wrapped: **5** (`createImport`, `updateImport`, `deleteImport`, `updateStagedInventoryRows`, `markStagedRowsForImport`)
- New deps: **0**
- Typecheck: **57 errors total — exact baseline match. Zero new errors in PR 5 scope.**
- Tests: **18 failed / 164 passed — exact baseline match.** Imports-client tests: **4/4 passing.**
- Engine imports under `apps/web/modules/imports/components/list/` and `data/mutations.ts`: **0** (unchanged).

---

## Files created

1. `apps/web/query-policies/index.ts` — exports `ListFreshness` type and three named presets:
   - `LIST_FRESHNESS_LIVE` — 5s poll, 0 stale.
   - `LIST_FRESHNESS_STANDARD` — 10s poll, 5s stale.
   - `LIST_FRESHNESS_OFF` — no poll, 30s stale (matches global default).
2. `apps/web/query-policies/CLAUDE.md` — short directory note explaining what the folder is, who imports from it (list controllers today; record controllers later), and the named-preset rule.
3. `apps/web/modules/imports/controllers/use-imports-list-mutations.ts` — shared hook returning the 5 imports mutations as `UseMutationResult` objects. Each `onSuccess` invalidates `IMPORTS_LIST_QUERY_KEY`.

## Files modified

4. `apps/web/controllers/list-view/contracts/list-controller-input.ts` — added `ListControllerFreshness` type; extended `ListControllerFetchInput` with optional `freshness?: { refetchIntervalMs?: number; staleTimeMs?: number }`.
5. `apps/web/controllers/list-view/index.ts` — re-exports the new `ListControllerFreshness` type.
6. `apps/web/controllers/list-view/use-server-list-controller.ts` — `useFetchListController`'s `useQuery` now reads `refetchInterval` and `staleTime` from `input.freshness` (both `undefined` when not opted in → falls back to global `<AppProviders>` config).
7. `apps/web/modules/imports/components/list/imports-client.tsx` — imports `LIST_FRESHNESS_STANDARD` from `@/query-policies`, passes it to `useServerListController`.
8. `apps/web/modules/imports/controllers/use-imports-list-controller.ts` — consumes `useImportsListMutations()` and exposes the result on the controller's return value as `mutations`. No new state today (no list-page-initiated mutations); the seam is in place for future delete-from-row / bulk actions.
9. `apps/web/modules/imports/controllers/use-import-primary-section.ts` — replaced direct `updateImportRequest` / `deleteImportRequest` calls with `await updateImport.mutateAsync(...)` / `await deleteImport.mutateAsync(...)` from the shared hook. Engine `saveSection` / `deleteRecord` callback signatures preserved.
10. `apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts` — replaced direct `updateImportStagedInventoryRowsRequest` and `markStagedRowsForImportRequest` calls with `await updateStagedInventoryRows.mutateAsync(...)` and `await markStagedRowsForImport.mutateAsync(...)`. Engine `onSave` and `useBatchSelectAction({ performAction })` signatures preserved.

(Counted as 6 modified files in the plan headline; the `controllers/list-view/index.ts` re-export adjustment was unanticipated but trivial. Adjusted total: 3 created + 7 modified.)

---

## Behavior delivered

- **Always-on 10s polling** of the imports list query while the tab is focused. Workers that finish mid-session show up within the polling interval without page reload.
- **Instant refresh on own-mutation.** Save record (primary, staged rows, mark-for-import) → invalidation fires → on navigation back to list, query is already refetching.
- **`refetchOnWindowFocus: true`** still in effect from `<AppProviders>`. Tab return refetches.
- **No polling on hidden tabs** — `refetchIntervalInBackground` stays at React Query's default `false`.

---

## Verification commands run

```bash
# typecheck (web workspace only — workspace-level typecheck blocked on a pre-existing
# prisma-guard failure in packages/domain/src/flooring/imports/staged-inventory-rows/types.ts,
# unrelated to PR 5)
cd apps/web && ../../node_modules/.bin/tsc -p tsconfig.json --noEmit
# → 57 errors total (exact baseline match). Zero errors in modules/imports, controllers/list-view,
#   or query-policies scope.

# tests (web workspace)
cd apps/web && ../../node_modules/.bin/vitest run
# → 9 test files failed / 37 passed (46 total)
# → 18 tests failed / 164 passed (182 total) — exact baseline match.

# imports-client tests specifically
cd apps/web && ../../node_modules/.bin/vitest run tests/modules/imports/imports-client.test.tsx
# → 4/4 passing.

# engine-import scan
rg "modules/shared/engines" apps/web/modules/imports/components/list apps/web/modules/imports/data
# → only hit: apps/web/modules/imports/data/queries.ts (record-view loader timing import,
#   pre-existing and out of scope per PR 3 docs).
```

---

## What was NOT done (deferred)

- **`setMessage` / `setPageError` driven off mutation state** in `use-imports-list-controller.ts`. Today the list page has no list-page-initiated mutations (create / openImport are navigations to the record page; record-page section controllers manage their own messaging via the engine). Wiring the banner state today would surface state that never changes. The hook is consumed and exposed via `controller.mutations` so the wiring is a one-line add when the first list-page-initiated UI lands. Flagged in the plan as "for any future list-initiated mutation."
- Manual dev-server smoke (Network-tab confirmation of 10s polling, navigation-back refetches, etc.). The codebase changes are correct and typecheck/tests are at baseline; user should run a manual smoke pass to confirm UX.
- Test coverage for the new `freshness` plumbing. No tests broke; adding a positive assertion is a cheap follow-up if desired.

---

## Forward compatibility (preserved, not built)

- `RECORD_FRESHNESS_*` presets land in the same `apps/web/query-policies/` folder when the record-view migration starts. The `LIST_*` prefix already separates concerns.
- Worker-aware polling boost layers on top of any preset later: a hook reads the preset, bumps `refetchIntervalMs` lower while a row signals pending. No PR 5 rewrite required.
- Other modules (inventory, work-orders, cut-logs, templates) opt in by adding a single `freshness:` prop to their `useServerListController` call once they land on the new controller.

---

## Definition of done

- [x] `apps/web/query-policies/index.ts` and `CLAUDE.md` exist; export the three named presets.
- [x] `useServerListController` accepts a `freshness` prop in fetch mode and forwards it into `useQuery`.
- [x] `useImportsListMutations()` exists, wraps all 5 imports mutations, invalidates `IMPORTS_LIST_QUERY_KEY` on success.
- [x] Imports list passes `LIST_FRESHNESS_STANDARD`.
- [x] `use-import-primary-section.ts` and `use-import-staged-inventory-rows-section.ts` route through `useImportsListMutations()`.
- [x] Typecheck + tests at baseline.
- [ ] Manual smoke (deferred to user).
