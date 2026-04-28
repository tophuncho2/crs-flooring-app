# Imports List-View Migration — PR 5 Execution Plan

**As of:** 2026-04-28. Companion to:
- [imports-list-view-migration-intent.md](imports-list-view-migration-intent.md)
- [imports-list-view-migration-progress.md](imports-list-view-migration-progress.md) (PRs 1–3)
- [imports-list-view-migration-plan-pr-4-6.md](imports-list-view-migration-plan-pr-4-6.md) (forward plan)
- [imports-list-view-migration-status-check.md](imports-list-view-migration-status-check.md) (audit)

PR 5 supersedes the polling-deferred posture in the PR 4–6 forward plan. Scope expansion: **always-on polling** is folded into PR 5 alongside mutation invalidation, behind a per-module opt-in. Imports is the first opter-in.

---

## TL;DR

PR 5 ships two coupled changes:

1. **Always-on polling**, opt-in via a controller prop, plumbed through one new shared peer directory `apps/web/query-policies/` that exports named presets (`LIST_FRESHNESS_LIVE`, `LIST_FRESHNESS_STANDARD`, `LIST_FRESHNESS_OFF`). Imports list opts in to `LIST_FRESHNESS_STANDARD` (10s polling, 5s stale).
2. **Mutation invalidation** via a shared imports hook `useImportsListMutations()` that wraps the 5 imports mutations in `useMutation` and invalidates `IMPORTS_LIST_QUERY_KEY` on success. List controller and both record-view section controllers consume it.

**Headlines / counts**
- New files: **3**
- Modified files: **6**
- Mutations wrapped: **5** (`createImportRequest`, `updateImportRequest`, `deleteImportRequest`, `updateImportStagedInventoryRowsRequest`, `markStagedRowsForImportRequest`)
- New deps: **0**
- Engine imports under `apps/web/modules/imports/components/list/` and `apps/web/modules/imports/data/`: **stays at 0**

---

## Decisions baked in (locked from the prior session)

1. **Polling is always-on** when a freshness preset is passed — not gated on workers / pending state.
2. **Per-module opt-in** via a single optional controller prop. No prop = current behavior (no polling, 30s stale from `<AppProviders>`).
3. **No worker-aware boost** in PR 5. The forward-compatible shape: a future hook reads the same preset and bumps `refetchIntervalMs` lower while a row signals pending.
4. **`refetchIntervalInBackground` stays at React Query's default `false`.** No polling on hidden tabs.
5. **Freshness presets live outside the controller** in `apps/web/query-policies/` — peer to `apps/web/transport/` and `apps/web/controllers/`. Modules import named presets, not raw numbers, so swapping intervals globally is a one-line change.
6. **Mutation invalidation seam**: a shared imports hook wraps mutations. List controller and record-view section controllers both consume it. This is the seam that makes "edit a record, return to list, see fresh data" feel instant — invalidation fires on save; the next list-query read is already refetching.

---

## Scope

**In:** imports module only. The polling change to `useServerListController` is generic (lives in shared controller), but no other module opts in this PR. The mutation hook is imports-specific.

**Out:** PR 4 (async `SearchDropdown`), PR 6 (canonical pattern doc), worker-aware polling boost, inventory / work-orders / cut-logs / templates list views, `RECORD_FRESHNESS_*` presets (the `query-policies/` folder will host them when record-view migrates), engine cleanup (orphaned `listImports()`, `engines/common/transport/*`).

---

## File changes

### New files (3)

#### 1. `apps/web/query-policies/index.ts`

```ts
export type ListFreshness = {
  refetchIntervalMs?: number
  staleTimeMs?: number
}

export const LIST_FRESHNESS_LIVE: ListFreshness     = { refetchIntervalMs:  5_000, staleTimeMs:      0 }
export const LIST_FRESHNESS_STANDARD: ListFreshness = { refetchIntervalMs: 10_000, staleTimeMs:  5_000 }
export const LIST_FRESHNESS_OFF: ListFreshness      = { refetchIntervalMs: undefined, staleTimeMs: 30_000 }
```

#### 2. `apps/web/query-policies/CLAUDE.md`

Short directory note (3–5 lines): what this folder is, who imports from it (list controllers today; record controllers when record-view migrates), and the rule that consumers import named presets — not raw numbers — so global tuning stays one-line.

#### 3. `apps/web/modules/imports/controllers/use-imports-list-mutations.ts`

Shared hook. Wraps each imports mutation in `useMutation`. On `onSuccess`, calls `queryClient.invalidateQueries({ queryKey: IMPORTS_LIST_QUERY_KEY })`. Returns the five `UseMutationResult` objects so callers can `mutateAsync(args)` (engine section controllers expect an async callback) or read `.isPending` / `.error` directly.

```ts
"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createImportRequest,
  deleteImportRequest,
  markStagedRowsForImportRequest,
  updateImportRequest,
  updateImportStagedInventoryRowsRequest,
} from "@/modules/imports/data/mutations"
import { IMPORTS_LIST_QUERY_KEY } from "@/modules/imports/data/list-imports-request"

export function useImportsListMutations() {
  const queryClient = useQueryClient()
  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: [...IMPORTS_LIST_QUERY_KEY] })

  const createImport = useMutation({
    mutationFn: createImportRequest,
    onSuccess: invalidateList,
  })

  const updateImport = useMutation({
    mutationFn: (args: { id: string; input: Parameters<typeof updateImportRequest>[1]; revisionKey: string }) =>
      updateImportRequest(args.id, args.input, args.revisionKey),
    onSuccess: invalidateList,
  })

  const deleteImport = useMutation({
    mutationFn: (args: { id: string; updatedAt: string }) =>
      deleteImportRequest(args.id, args.updatedAt),
    onSuccess: invalidateList,
  })

  const updateStagedInventoryRows = useMutation({
    mutationFn: (args: {
      importId: string
      diff: Parameters<typeof updateImportStagedInventoryRowsRequest>[1]
      revisionKey: string
    }) => updateImportStagedInventoryRowsRequest(args.importId, args.diff, args.revisionKey),
    onSuccess: invalidateList,
  })

  const markStagedRowsForImport = useMutation({
    mutationFn: (args: { importId: string; stagedRowIds: string[] }) =>
      markStagedRowsForImportRequest(args.importId, args.stagedRowIds),
    onSuccess: invalidateList,
  })

  return {
    createImport,
    updateImport,
    deleteImport,
    updateStagedInventoryRows,
    markStagedRowsForImport,
  }
}
```

### Modified files (6)

#### 4. `apps/web/controllers/list-view/contracts/list-controller-input.ts`

Extend `ListControllerFetchInput` with one optional field. SSR mode unchanged.

```ts
export type ListControllerFetchInput<TRow, TFilters = Record<string, never>> = ListControllerInputBase<TFilters> & {
  mode: "fetch"
  queryKey: readonly unknown[]
  listFn: (input: ListInput<TFilters>) => Promise<ListOutput<TRow>>
  initialData?: ListOutput<TRow>
  freshness?: { refetchIntervalMs?: number; staleTimeMs?: number }
}
```

#### 5. `apps/web/controllers/list-view/use-server-list-controller.ts`

In `useFetchListController`, plumb `input.freshness` into `useQuery`:

```ts
const queryResult = useQuery({
  queryKey,
  queryFn: () => listFn(listInput),
  initialData,
  placeholderData: (previous) => previous,
  refetchInterval: input.freshness?.refetchIntervalMs,
  staleTime: input.freshness?.staleTimeMs,
})
```

When `freshness` is omitted, both fields stay `undefined` and React Query falls back to the global `<AppProviders>` config (no polling, 30s stale). **Behavior is identical to today for any non-opted-in caller.**

#### 6. `apps/web/modules/imports/components/list/imports-client.tsx`

Add the import and pass the preset:

```tsx
import { LIST_FRESHNESS_STANDARD } from "@/query-policies"
// …
useServerListController<ImportRow, ImportsListFilters>({
  // …existing props…
  freshness: LIST_FRESHNESS_STANDARD,
})
```

#### 7. `apps/web/modules/imports/controllers/use-imports-list-controller.ts`

Consume `useImportsListMutations()`. Today the list page has no list-initiated mutations (create/import are navigations), so the only thing this hook wires now is exposing handlers + driving `setMessage` / `setPageError` from mutation state for any future list-initiated mutation. Keep `useRecordEntryNavigation`-driven `openCreate` / `openImport` exactly as-is.

#### 8. `apps/web/modules/imports/controllers/use-import-primary-section.ts`

Consume `useImportsListMutations()`. Replace direct mutation calls inside the engine `saveSection` and `deleteRecord` callbacks with `await mutations.updateImport.mutateAsync(...)` and `await mutations.deleteImport.mutateAsync(...)`. Engine callback signatures preserved (they want an async function; `mutateAsync` returns one).

#### 9. `apps/web/modules/imports/controllers/use-import-staged-inventory-rows-section.ts`

Same swap for `updateImportStagedInventoryRowsRequest` (inside engine `onSave`) and `markStagedRowsForImportRequest` (inside `useBatchSelectAction({ performAction })`). Both engine wrappers accept async callbacks; `mutateAsync` slots in cleanly.

---

## Behavior delivered

- **Always-on 10s polling** while the imports list view is focused. A worker that finishes mid-session shows up in the list within 10s without leaving the page.
- **Instant refresh on own-mutation.** Save record → invalidation fires → on navigation back to the list, the query is already refetching (and the polling tick will repaint within the polling interval anyway).
- **`refetchOnWindowFocus: true`** continues working from `<AppProviders>`. Tab return refetches.

---

## Forward compatibility (not built, just preserved)

- **`RECORD_FRESHNESS_*` presets** will live in the same `apps/web/query-policies/` folder when the record-view migration lands. The `LIST_*` prefix already separates concerns so they don't collide.
- **Worker-aware polling boost** layers on top later: a hook reads the same preset, bumps `refetchIntervalMs` lower while a row signals pending. No PR 5 rewrite needed.

---

## Verification plan

- `pnpm typecheck` — expect 57 errors (matches baseline; zero new).
- `pnpm test` — expect 18 failed / 164 passed (baseline). Imports list test still passes.
- Dev server smoke:
  - List view loads. Network tab shows a `GET /api/imports?…` every ~10s while focused.
  - Create import → return to list → list reflects the new row immediately.
  - Edit primary fields → return to list → updated row visible immediately.
  - Delete → list refetches without the deleted row.
  - Edit staged rows → return to list → staged/live counts on the row reflect the save.
  - Mark-for-import → list reflects flipped status (worker may still be running; the next 10s tick picks up the worker's eventual write).
  - Hide the tab for 30s → confirm no polling fires (`refetchIntervalInBackground` default).
- `rg "modules/shared/engines" apps/web/modules/imports/components/list apps/web/modules/imports/data` → still 0 hits.
- `rg "engines" apps/web/modules/imports/controllers/` → still expected hits in record-view section controllers (`useSingleSectionRecordController`, `useRecordScopedSectionController`, `useBatchSelectAction`, `useRecordEntryNavigation`, etc.) — these stay until the record-view migration sweep.

---

## Risks

- **Polling chatter on idle tabs.** Mitigated by `refetchIntervalInBackground` default (`false`).
- **Engine hook signatures.** `useSingleSectionRecordController` and `useRecordScopedSectionController` accept async callbacks; `mutateAsync` matches. If either silently expects a bare `Promise` rather than a callable, a 2-line wrapper closes the gap.
- **Doubled invalidations on staged-row save.** `updateImportStagedInventoryRowsRequest` returns updated `import` + `stagedRows`; the engine controller calls `publishRecord(response.import)` after, which is local state, not React Query. No double-fetch race.
- **Test expectations.** No test currently asserts `freshness` plumbing. None will break, but follow-up coverage is a cheap add (deferred unless requested).

---

## Out of scope for PR 5 (explicit deferrals)

- PR 4 (async `SearchDropdown`) — separate PR.
- PR 6 (canonical pattern doc) — once PR 5 lands, doc will reference it.
- Worker-aware polling boost — speculative until a row-pending UI exists for imports lists.
- Other modules' list views (inventory, work-orders, cut-logs, templates) — opt in when each migrates.
- `RECORD_FRESHNESS_*` presets — added when the record-view migration lands.
- Engine cleanup (`engines/common/transport/*`, orphaned `@builders/db` `listImports()`, etc.) — deferred until all modules are off the engine.
- Imports record-view migration — separate sweep.

---

## Definition of done for PR 5

- `apps/web/query-policies/index.ts` and `CLAUDE.md` exist and export the three named presets.
- `useServerListController` accepts a `freshness` prop in fetch mode and forwards it into `useQuery`.
- `useImportsListMutations()` exists, wraps all 5 imports mutations, invalidates `IMPORTS_LIST_QUERY_KEY` on success.
- Imports list passes `LIST_FRESHNESS_STANDARD`.
- `use-import-primary-section.ts` and `use-import-staged-inventory-rows-section.ts` route through `useImportsListMutations()`.
- Typecheck + tests at baseline.
- Manual smoke: own-mutation invalidation visible; 10s polling visible while focused; no polling while hidden.
