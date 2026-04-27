# Imports List-View Migration — Intent

**Status:** Intent declared, not yet started.
**Date:** 2026-04-27.
**Scope:** `apps/web/modules/imports/` only. Inventory, work orders, templates, cut logs, and all record-view migrations are explicitly out of scope for this sweep.

---

## Why this sweep exists

Three problems compound today:

1. **List-view tooling runs on the client.** Search, sort, filter, group, and pagination all execute over an in-memory array loaded by SSR. The shared engine `useConfiguredTableState` was built for client-only operation. Inventory and work orders will exceed several thousand rows within months. The current model breaks long before that.

2. **Worker completion does not refresh list views.** When the cut-logs worker finishes a job, the client never learns. The user manually refreshes. Even synchronous record saves don't refresh the surrounding list. The system has no mechanism — no `revalidatePath`, no SSE, no React Query invalidation — to bridge mutation/worker completion back to list state.

3. **The shared engine is a dead end.** It lives at `apps/web/modules/shared/engines/`, which buries shared infrastructure inside the modules tree. It mixes controllers, transport, contracts, components, and helpers in one folder. ~69% of its 154 files are dead at the individual-file level but masked by `export *` barrels. Adding new server-driven features to the engine compounds debt and makes future migration harder.

The plan: stand up new top-level homes that mirror the engine's real concerns, migrate **imports** as the first module to use them, and prove the canonical pattern that every subsequent module sweep will follow.

---

## Engine inventory snapshot

Source: full audit on 2026-04-27.

| Subfolder | Files | Live (direct importers) | Dead at file level | Notes |
|---|---|---|---|---|
| `common/` | 22 | ~22 | ~0 | Mostly live; transport, navigation, feedback, record-entry routing |
| `list-view/` | 28 | 15 | 13 | Table rendering + `useConfiguredTableState` |
| `record-view/` | 104 | 11 | 93 | 90% file-level dead; reached only via `export *` barrels |
| **Total** | **154** | **48** | **~107 (≈69%)** | |

**Categories present:** controllers (28), components (74), contracts (19), transport (3), helpers (26), other (4).

**Transport in the engine** — confirmed:
- `engines/common/transport/http.ts` — re-export of `@builders/lib` `requestJson`.
- `engines/common/transport/mutation.ts` — mutation envelope, idempotency keys, 409 conflict parsing.
- `engines/common/transport/client-errors.ts` — HTTP error message extraction.
- `engines/list-view/controllers/table-preference-client.ts` — stray raw `fetch()` with hardcoded route.

**Anomalies flagged for the migration to address:**
- `record-view/contracts/child-item-validation.ts` contains decimal-normalization logic that may be module-specific (layering violation).
- `engines/common/record-entry/routes.ts` is misleadingly named — holds return-path helpers, not Next routes.
- `record-view/index.ts` does 8 `export *` re-exports; consumers import `* as RecordViewEngine` and destructure, hiding which files are actually live.

---

## New top-level homes

The engine isn't one concern — it's five. The new homes mirror that as peers under `apps/web/`, not as a single folder.

```
apps/web/
  components/                          # already designed; see components/CLAUDE.md
    grid/                              # streaming-row data grid (existing plan)
    layout-grid/                       # positioned-cell grid (existing plan)
    fields/, cells/, dropdowns/        # existing plan
    features/{search,sort,group,paginate}/   # NEW — feature controls (search box, sort toggle, group control, paginator)
    dropdowns/search-dropdown.tsx      # NEW — async-backed dropdown sibling to RichDropdown
  controllers/                         # NEW — shared React state hooks
    list-view/
      use-server-list-controller.ts
      contracts/
        list-controller-input.ts
        list-controller-output.ts
      url-bindings/
        nuqs-bindings.ts
    dropdown-search/
      use-search-dropdown-controller.ts
  transport/                           # NEW — cross-cutting HTTP plumbing (migrated from engines/common/transport/)
    http.ts
    mutation.ts                        # envelope + idempotency + 409 conflict handling
    client-errors.ts
  modules/
    imports/
      data/                            # module-specific typed fetch wrappers (list-imports-request.ts, etc.)
      controllers/                     # module-specific controllers (form, navigation)
      components/list/imports-client.tsx
```

**Rules of placement:**
- Generic, cross-module transport (envelope, conflict handling, error parsing) → `apps/web/transport/`.
- Module-specific typed fetch wrappers (e.g. `list-imports-request.ts`) → `modules/<x>/data/`.
- Shared cross-module controllers → `apps/web/controllers/`.
- Module-specific controllers → `modules/<x>/controllers/`.
- Per-feature contracts → co-locate under their controller (e.g. `controllers/list-view/contracts/`); not a top-level `contracts/` peer.

**Rejected names** for the controllers home:
- `apps/web/lib/controllers/` — `lib/` is dead-letter naming.
- `apps/web/state/` — doesn't admit non-state controllers (polling, dropdown search).
- `apps/web/hooks/` — too generic; would become an attic.

---

## Shared list-view contract

Lives in `@builders/application/list-view/contracts.ts`:

```ts
type SortDirection = 'asc' | 'desc'

type ListInput<TFilters> = {
  search?: string
  sort?: { field: string; direction: SortDirection }
  filters?: TFilters
  group?: { field: string }
  page: number
  pageSize: number
}

type ListGroup = {
  key: string
  count: number
  sum?: Record<string, number>      // populated by inventory + work orders later; imports ignores
}

type ListOutput<TRow> = {
  rows: TRow[]
  total: number
  groups?: ListGroup[]
}
```

**Each module owns its own list use case** (`listImportsUseCase`, `listInventoryUseCase`, ...). The contract is shared; the orchestration is module-specific (joins, allowable fields, group keys, filter shapes).

**A list use case is a use case, not a thin query wrapper**, because it validates input, enforces module-level allowlists (which fields are filterable/sortable/groupable), maps DTOs to repo predicates, and composes `count + rows + groupBy aggregates` under one logical operation.

---

## Phased plan (imports only)

### Phase 0 — Install dependencies

- `@tanstack/react-query` — server state cache, refetch, invalidation.
- `nuqs` — URL-synced query state.
- Mount `QueryClientProvider` in the root layout.

**No** TanStack Table, no realtime library. Polling + React Query invalidation covers the worker-completion gap for now.

### Phase 1 — Build empty shells in their final homes

- `apps/web/transport/{http,mutation,client-errors}.ts` — copies of the engine versions.
- `apps/web/controllers/list-view/` — `use-server-list-controller.ts` shell, contracts, nuqs bindings.
- `apps/web/components/features/{search,sort,group,paginate}/` — feature control shells.
- `apps/web/components/dropdowns/search-dropdown.tsx` — async-backed shell.

Engine versions stay in place during this phase.

### Phase 2 — Migrate imports off the engine, **client-mode**

Imports' `imports-client.tsx` consumes the new controller and feature controls — but the controller wraps the existing all-rows array (no server fetch yet). Behavior identical to today. Proves the seam works without moving the goalposts. Imports stops importing from `engines/`.

### Phase 3 — Flip imports to server-driven mode

- `@builders/application/imports/use-cases/list-imports-use-case.ts` (with allowed sort/filter/group field allowlists).
- `@builders/db/imports/list-read-repository.ts` (rows + count + optional groupBy).
- `apps/web/app/api/imports/list/route.ts` (Zod-validated query params).
- `modules/imports/data/list-imports-request.ts` (typed fetch wrapper).
- Controller flips to server mode. Imports' SSR-load-everything path deleted.

**Imports needed features:** grouping, filtering, search by import #, sorting (canonical pattern, even though imports doesn't strictly need it), pagination. Group sums **not** populated for imports — but the contract reserves `groups[].sum` so inventory/work orders can populate it later without a contract change.

### Phase 4 — Async dropdown for imports

- `@builders/application/imports/use-cases/search-imports-for-dropdown-use-case.ts`.
- `apps/web/app/api/imports/dropdown-search/route.ts`.
- `SearchDropdown` primitive wired with React Query (debounced, `keepPreviousData`).
- Replace any imports-related `RichDropdown` usages.

`RichDropdown` stays for static enum option sets; `SearchDropdown` is the async-backed sibling for thousands-of-rows option sets.

### Phase 5 — Refresh state on mutation + worker completion

- Every imports mutation calls `queryClient.invalidateQueries(['imports','list'])` on success.
- For any imports flow that has async outbox steps: extend the existing `usePendingWorkflowPolling` pattern to the list level — while there's an outstanding outbox event for any visible row, poll the list query at 3–5s.
- React Query `refetchOnWindowFocus: true` covers most "I came back to the tab and it's stale" cases for free.

### Phase 6 — Document canonical pattern

Write a short canonical-pattern doc so inventory, work orders, templates, cut logs, and record-view sub-grids can adopt the same shape mechanically in subsequent sweeps.

---

## What is **not** in scope

- Inventory list-view migration. (Will follow imports as the second module.)
- Work orders, templates, cut logs, products, etc.
- Record-view sub-grids. (Same engine target, separate sweep.)
- Replacement of `useConfiguredTableState` for non-imports modules. (Stays in engine until each module is migrated.)
- TanStack Table adoption. (Custom table component is fine; not the bottleneck.)
- Realtime push (SSE / WebSocket / Pusher). (Polling + invalidation is sufficient for the imports phase; revisit when polling proves chatty.)
- Deletion of any engine code. (Engine stays in place until every module migrates off it.)
- Resolution of the `record-view/contracts/child-item-validation.ts` layering violation. (Flagged in the inventory; not part of this sweep.)
- Resolution of the `record-view/index.ts` star-export barrels. (Flagged; not part of this sweep.)

---

## Open questions to resolve before kickoff

1. **Phase 2 vs Phase 3 packaging** — one PR for both (imports lands directly in server mode), or two (client-mode migration first, server-mode flip second)? Two is safer but slower. Recommend: two PRs.
2. **Module-specific filter spec validation** — does this live in the use case, in `@builders/domain/imports/`, or in a shared `@builders/application/list-view/` allowlist helper? Recommend: declared in the use case (per-module ownership), validated by a shared helper.
3. **Worker-completion polling** — does the imports module currently have any async outbox flows that need list-level polling, or is Phase 5's polling work entirely speculative for imports? Audit before building.

---

## Success criteria

- `apps/web/modules/imports/` has zero imports from `apps/web/modules/shared/engines/`.
- Imports list view runs server-driven search / sort / filter / group / paginate.
- Imports list refreshes automatically on mutation success.
- The contract in `@builders/application/list-view/` and the shells in `apps/web/controllers/list-view/`, `apps/web/transport/`, `apps/web/components/features/` are in place and ready to be adopted by the next module.
- Canonical-pattern doc written so the inventory sweep can follow without redesign.
