# V1 Master Execution Log — Sweeps 4-6

**Branch:** `staging` · **Plan:** [`sessions/v1-master-plan.md`](v1-master-plan.md) · **Started:** 2026-04-30

This file is updated after each sweep (and per sub-step within Sweep 4) ships. Sweeps 1-3 + ad-hoc imports work archived at [`sessions/sweeps-1-3/`](sweeps-1-3/).

---

## Status

| # | Sweep | Status | Date | Commit(s) |
|---|---|---|---|---|
| 4a | Decommission inventory-side cut-log routes + workers | 🟡 Code shipped, awaiting commit | 2026-04-30 | _(pending)_ |
| 4b | Inventory cut-logs section → read-only viewer | 🟡 Code shipped, awaiting commit | 2026-04-30 | _(pending)_ |
| 4c | WOMI cut-log UI redesign + adopt shared batch-select | 🟡 Code shipped, awaiting commit | 2026-04-30 | _(pending)_ |
| 4d | Verify domain invariant + dev-server smoke | ⬜ Not started | — | — |
| 5 | WO Files section UI (Phase 2c) | ⬜ Not started | — | — |
| 6 | Service variables → Railway | ⬜ Not started | — | — |

Legend: ⬜ Not started · 🟡 In progress · ✅ Shipped · ❌ Blocked

---

## Pre-flight: open questions

All resolved 2026-04-30. Plan locked.

| # | Question | Resolution |
|---|---|---|
| §A | Sweep 4a — dead-code aggressiveness | ✅ Delete inventory-side use cases whose only consumers were the deleted routes. Keep `apply-cut-log-pending-diff.ts` (WOMI workers still call it for parent-inventory `totalCutSum`). |
| §B | Sweep 4c — selection-mode UX (drop the toggle?) | ✅ Drop the toggle. Checkboxes always-visible-when-clean, disabled-when-dirty. Matches imports. |
| §C | Sweep 5 — PDF content gaps | ✅ Ship `generate-work-order-file.ts` untouched. Sweep 5 only wires UI; no PDF content changes. Iterate post-V1 if real gaps surface. |
| §D | Sweep 4c — `use-work-order-cut-log-finalize.ts` disposition | ✅ Delete after WOMI adopts shared `useGatedBatchSelect`. Only consumer is the WOMI flow being migrated. |
| §E | Sweep 4a — `void-cut-log.ts` worker disposition | ✅ Delete the worker + outbox event type + processor. Confirmed by reading `void-work-order-cut-log.ts`: synchronous use case handles row lock (`FOR UPDATE`), patch (clears fields + sets VOID), `recomputeAndPersistTotalCutSums`, invariant check — all in one tx. |

---

## Sweep 4a — Decommission inventory-side cut-log routes + workers

**Date:** 2026-04-30 · **Status:** 🟡 Code shipped, awaiting commit · **Typecheck:** ✅ Full chain green

### Plan deviations surfaced during execution

Two deviations from the plan, both honoring §A's principle (delete dead code; typecheck guards correctness):

1. **`apply-cut-log-pending-diff.ts` was also dead.** Plan said "keep — WOMI workers still call into it for parent-inventory `totalCutSum`." Audit showed WOMI has its own [apply-work-order-item-pending-cut-log-diff.ts](../packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts) that uses different db primitives (`applyWorkOrderItemCutLogPendingDiff`, `lockInventoriesForCutLogBatch`, `recomputeAndPersistTotalCutSums`, etc.). It does NOT call into the inventory-side apply use case. Deleted the entire `packages/application/src/flooring/inventory/cut-logs/` directory.
2. **`cut-log-row-actions/` had zero consumers.** Plan said `void-cut-log-button.tsx` was "currently used by the inventory section being made read-only in 4b." Grep confirmed the inventory section does NOT import either component. Deleted both `cut-log-links-editor.tsx` and `void-cut-log-button.tsx` in 4a (no need to defer to 4b).

The WO-side void use case `voidWorkOrderCutLogUseCase` will get a new per-row Void button as part of Sweep 4c (separate from the deleted inventory-side button).

### Files deleted (24)

**Inventory-side API routes + validators (entire directory — 5 files, 4 sub-dirs):**
1. `apps/web/app/api/inventory/[id]/cut-logs/_validators.ts`
2. `apps/web/app/api/inventory/[id]/cut-logs/section/route.ts`
3. `apps/web/app/api/inventory/[id]/cut-logs/finalize/route.ts`
4. `apps/web/app/api/inventory/[id]/cut-logs/void/route.ts`
5. `apps/web/app/api/inventory/[id]/cut-logs/links/route.ts`

**Inventory-side worker processors + tests (6 files):**
6. `apps/worker/src/processors/pending-save-cut-log-batch.ts`
7. `apps/worker/src/processors/finalize-cut-log-batch.ts`
8. `apps/worker/src/processors/void-cut-log.ts`
9. `apps/worker/tests/pending-save-cut-log-batch.test.ts`
10. `apps/worker/tests/finalize-cut-log-batch.test.ts`
11. `apps/worker/tests/void-cut-log.test.ts`

**Domain outbox event types (3 files):**
12. `packages/domain/src/queue/pending-save-cut-log-batch.ts`
13. `packages/domain/src/queue/finalize-cut-log-batch.ts`
14. `packages/domain/src/queue/void-cut-log.ts`

**Relay dispatchers (3 files):**
15. `apps/relay/src/dispatch/build-pending-save-cut-log-dispatcher.ts`
16. `apps/relay/src/dispatch/build-finalize-cut-log-dispatcher.ts`
17. `apps/relay/src/dispatch/build-void-cut-log-dispatcher.ts`

**Inventory-side use cases (entire `packages/application/src/flooring/inventory/cut-logs/` — 10 files):**
18. `apply-cut-log-pending-diff.ts` *(deviation 1: also dead, per audit)*
19. `errors.ts` (`CutLogExecutionError` + `CutLogExecutionErrorCode`)
20. `types.ts`
21. `save-cut-log-pending-diff.ts`
22. `mark-cut-logs-for-finalize.ts`
23. `finalize-cut-logs.ts`
24. `mark-cut-log-for-void.ts`
25. `void-cut-log.ts` (inventory-side void use case)
26. `update-cut-log-links.ts`
27. `index.ts` (barrel)

**Components (entire `apps/web/components/cut-log-row-actions/` — 2 files):** *(deviation 2)*
28. `cut-log-links-editor.tsx`
29. `void-cut-log-button.tsx`

(Net file deletion count: 26 files + 2 dirs that became empty and were removed.)

### Files edited (4)

1. [apps/worker/src/bootstrap.ts](../apps/worker/src/bootstrap.ts) — removed 3 worker registrations (~110 lines each), 3 imports (queue constants + payload types), 3 handler imports, 3 entries each from `Promise.all([…waitUntilReady])`, `void worker.run()`, the "Worker ready" log details (`queues`, `concurrency`, `lockDurationMs`), and the shutdown `Promise.all([…close()])`
2. [apps/worker/src/env.ts](../apps/worker/src/env.ts) — removed 6 env vars (`PENDING_SAVE_CUT_LOG_WORKER_*`, `FINALIZE_CUT_LOG_WORKER_*`, `VOID_CUT_LOG_WORKER_*`) from the zod schema, the `WorkerEnvironment` type, the parse call, and the return projection
3. [apps/relay/src/dispatch/dispatchers.ts](../apps/relay/src/dispatch/dispatchers.ts) — removed 3 dispatcher imports + 3 entries from `buildDispatchers()` returned list
4. [packages/domain/src/index.ts](../packages/domain/src/index.ts) — removed 3 queue re-exports from the barrel
5. [packages/application/src/flooring/inventory/index.ts](../packages/application/src/flooring/inventory/index.ts) — removed `export * from "./cut-logs/index.js"` from the barrel

### Verification

- ✅ `npm run typecheck` — full chain green (guard:prisma + @builders/domain + @builders/lib + @builders/db + @builders/pdf + @builders/application + @builders/web (next typegen + tsc) + @builders/relay + @builders/worker)
- ✅ Initial typecheck failed on stale `apps/web/.next/dev/types/validator.ts` referencing the deleted route paths; cleared `.next/` and re-ran. Successful regeneration on second pass.
- ⏳ Dev-server smoke deferred to Sweep 4d (inventory section UI still renders the now-dead grid + dropdown buttons; calls to deleted routes 404 at runtime — addressed in 4b)

### Out-of-scope cleanup observed (deferred)

The data layer at [packages/db/src/flooring/inventory/cut-logs/write-repository.ts](../packages/db/src/flooring/inventory/cut-logs/write-repository.ts) still exposes functions whose only callers were the deleted use cases (`updateCutLogLinks`, `markCutLogsForFinalize`, `markCutLogForVoid`, plus their associated input/result types). These are dead at the data layer but were out of scope for §A (which targets the application layer). Track for a post-V1 sweep.

### Suggested commit message

```
inventory: decommission inventory-side cut-log routes + workers + use cases (sweep 4a)

V1 cut-log mutation surface lives only under WO record view. Decommissions
the parallel inventory-side surface that became dead after the WOMI flow
shipped:
- 4 API routes under apps/web/app/api/inventory/[id]/cut-logs/ (section,
  finalize, void, links) + their _validators.ts
- 3 BullMQ worker processors (pending-save, finalize, void) + their tests
- 3 outbox event types in packages/domain/src/queue/
- 3 relay dispatchers
- Entire packages/application/src/flooring/inventory/cut-logs/ directory
  (apply, save, mark-for-finalize, finalize, mark-for-void, void,
  update-links, errors, types, index)
- apps/web/components/cut-log-row-actions/ (links editor + void button —
  zero consumers; WO-side gets its own per-row Void in sweep 4c)
- Worker bootstrap + env: 3 worker registrations + 6 env vars

Plan deviations surfaced during audit (per resolved Open Q §A):
- apply-cut-log-pending-diff.ts was also dead (WOMI has its own apply use
  case using different db primitives; doesn't call into inventory-side)
- cut-log-row-actions had zero consumers (plan-noted inventory-section
  consumer was already gone)

Inventory record view's cut-logs section UI still renders + calls dead
routes — addressed in sweep 4b. WO record view is unaffected.

Typecheck: full chain green. Deferred: data-layer write-repo functions
that only the deleted use cases called are now also dead; out of §A's
scope. Tracked for post-V1 cleanup.
```


---

## Sweep 4b — Inventory cut-logs section → read-only viewer

**Date:** 2026-04-30 · **Status:** 🟡 Code shipped, awaiting commit · **Typecheck:** ✅ Full chain green

### Audit summary

Straightforward — all 5 in-scope files are isolated to the inventory module. Engine `cut-log-contracts.ts` (`EditableCutLog`, engine `CutLogDraft`) under `apps/web/modules/shared/engines/record-view/contracts/` has zero consumers but is out of scope per CLAUDE.md modules/shared rule.

### Files deleted (2)

1. [apps/web/modules/inventory/controllers/use-inventory-cut-logs-section.ts](../apps/web/modules/inventory/controllers/use-inventory-cut-logs-section.ts) — the entire mutation controller. Display-only sections don't need controllers (per plan).
2. [apps/web/modules/inventory/controllers/drafts.ts](../apps/web/modules/inventory/controllers/drafts.ts) — `CutLogDraft` type, `createCutLogDraft`, `toCutLogDrafts`, `isLocalCutLogDraft`, `validateCutLogDrafts`. The whole file's purpose was draft-shape + diff-validation for the deleted save flow.

### Files edited (4)

1. [apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx](../apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx) — rewritten as a read-only viewer. Props collapsed from 17 (drafts/serverRows/dirty/saving/conflict/notice/selection/finalize/handlers/...) to 4 (`rows`, `stockUnitAbbrev`, `coverageUnitAbbrev`, `totalCutSum`). Removed `ActionHeader` actions array, leading `selection` control, trailing `actions` control, all editable cells, `findDraftIndex`, `editableServerIds`, the draft-vs-server merge logic. Status indicator + summary header retained.
2. [apps/web/modules/inventory/data/mutations.ts](../apps/web/modules/inventory/data/mutations.ts) — removed `saveCutLogPendingDiffRequest` + `markCutLogsForFinalizeRequest` functions and their response types (~67 lines). Removed `CutLogsDiff` import. Kept `updateInventoryRequest` + `deleteInventoryRequest`.
3. [apps/web/modules/inventory/components/record/inventory-record-panel.tsx](../apps/web/modules/inventory/components/record/inventory-record-panel.tsx) — removed `useState<CutLogRow[]>` (no client-side mutation = no optimistic state needed; cut logs read straight from `controller.record.cutLogs`), removed `handleMarkedForFinalize`, removed `useInventoryCutLogsSection` import + usage, removed all 14 props passed to the section component (now just 4). The panel still partitions cut logs into pending vs. historical via the same `useMemo` filters.
4. [apps/web/controllers/record/use-batch-select-action.ts](../apps/web/controllers/record/use-batch-select-action.ts) — updated docstring (line 8-10) which named the deleted `useInventoryCutLogsSection` as a consumer; now points to staged-inv only and mentions the `useGatedBatchSelect` wrapper.

### Verification

- ✅ `npm run typecheck` — full chain green (guard:prisma + 7 workspaces)
- Cleared `.next/` before run; second pass green on first try (no stale-cache issues this round since no API routes were deleted in 4b)
- ⏳ Dev-server smoke deferred to 4d

### Out-of-scope (deferred)

- Engine-side `apps/web/modules/shared/engines/record-view/contracts/cut-log-contracts.ts` — zero external consumers, but per CLAUDE.md modules/shared rule we don't delete from there until consumers prove dead. Engine teardown is a separate post-V1 sweep.
- Domain `validateCutLogsDiff` + `CutLogPendingForm` types — still consumed by WOMI flow (not removed).

### Suggested commit message

```
inventory: cut-logs section becomes a read-only viewer (sweep 4b)

Inventory record view's cut-log section follows 4a's API decommission —
mutation surface lives only under WO record view. Inventory shows what
cut logs exist on each row, partitioned the same way the editable
surface used to (pending vs. final/voided), but every cell + control is
read-only.

- Delete use-inventory-cut-logs-section.ts (mutation controller dead
  after the routes shipped in 4a)
- Delete inventory's drafts.ts (CutLogDraft + diff-validation helpers
  consumed only by the deleted controller)
- Rewrite inventory-cut-logs-section.tsx as a 4-prop read-only viewer
  (rows, stockUnitAbbrev, coverageUnitAbbrev, totalCutSum)
- Strip cut-log mutation requests from inventory data/mutations.ts
  (saveCutLogPendingDiffRequest, markCutLogsForFinalizeRequest, their
  response types, and the CutLogsDiff import)
- Simplify inventory-record-panel.tsx: drop optimistic CutLogRow state,
  drop the finalize-merge handler, drop the controller wiring; cut
  logs come straight off controller.record.cutLogs
- Update use-batch-select-action.ts docstring that named the deleted
  useInventoryCutLogsSection by name

Typecheck: full chain green. Engine cut-log-contracts.ts has zero
external consumers but stays per modules/shared rule (CLAUDE.md);
post-V1 engine teardown territory.
```


---

## Sweep 4c — WOMI cut-log UI redesign + adopt shared batch-select

**Date:** 2026-04-30 · **Status:** 🟡 Code shipped, awaiting commit · **Typecheck:** ✅ Full chain green

### Pre-execution audit findings (resolved before code)

Plan said "expose section-level dirty flag" on `useWorkOrderItemPendingCutLogs` — but that hook was instantiated **per row** inside each expanded WOMI's `WorkOrderCutLogRow`. State was private to each row component. To support a section-header `Save Pending Cuts` button + cross-WOMI dirty aggregation, state had to be lifted up to the section.

User confirmed four architectural decisions before execution:

1. Lift cut-log state to section level (single hook, Map keyed by WOMI id)
2. **One** section-header `Save Pending Cuts` button (per-WOMI Save/Discard buttons removed; cleaner UI, single trigger)
3. Reuse the existing `apps/web/components/dialogs/ConfirmDialog` primitive; build a generic `apps/web/components/features/confirm-action/ConfirmActionButton` wrapper instead of cluttering the WO module
4. Single commit covering all 4c surfaces

User also added an explicit lock requirement: void button should be locked when pending-save or finalize is in flight for that section. Threaded through as section-wide signals.

### New primitive

[apps/web/components/features/confirm-action/confirm-action-button.tsx](../apps/web/components/features/confirm-action/confirm-action-button.tsx) — composes `RowActionButton` (cells/) + `ConfirmDialog` (dialogs/) with internal `open` + `isFiring` state. Async `onConfirm` keeps the dialog open while the action is in flight; closes on resolve, stays open on reject (consumer surfaces the error elsewhere). Generic — any per-row destructive action (Void, Delete, etc.) can adopt it. Mirrors the `features/select-batch/SelectAllButton` precedent (composite primitive built on lower-level pieces). Plus barrel index.

### Files created (3)

1. [apps/web/components/features/confirm-action/confirm-action-button.tsx](../apps/web/components/features/confirm-action/confirm-action-button.tsx)
2. [apps/web/components/features/confirm-action/index.ts](../apps/web/components/features/confirm-action/index.ts) — barrel
3. [apps/web/modules/work-orders/controllers/use-work-order-cut-log-section-state.ts](../apps/web/modules/work-orders/controllers/use-work-order-cut-log-section-state.ts) — section-level state hook. Owns `Record<workOrderItemId, { drafts, updates, deletes }>`. Per-WOMI accessors (`getStateForWomi`, `addDraft`, `updateDraft`, `editServerRow`, etc. — first arg is always `womiId`). Section-wide save mutation does `Promise.all` across dirty WOMIs. Cleanup logic removes empty entries from the map so `Object.keys(stateByWomi)` is exactly the dirty set.

### Files deleted (1)

1. `apps/web/modules/work-orders/controllers/use-work-order-cut-log-finalize.ts` — bespoke selection-mode hook replaced by `useGatedBatchSelect`. Per resolved Open Q §D.

### Files edited (3)

1. [apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx](../apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx) — major refactor:
   - Bespoke header div replaced with canonical [`ActionHeader`](../apps/web/components/headers/action-header.tsx) + `extraActions` slot for `SelectAllButton` (matches imports' pattern)
   - Six descriptor actions on the header: Add MI, Discard MI, Save MI, Discard Pending Cuts, Save Pending Cuts, Finalize Selected (N)
   - `useGatedBatchSelect` replaces `useWorkOrderCutLogFinalize`. Eligible rows = flat `Object.values(cutLogsByWorkOrderItemId).flat()` filtered by `status === "PENDING"`
   - `useWorkOrderCutLogVoid` instantiated once at section level and threaded down to every cut-log row
   - Section-wide lock signal (`sectionBusy` = isSelectionActive || isSavingPendingCuts || isFinalizingInFlight || section.isSaving) drives MI-cell editability + WOMI-row remove button gating
   - Old `ActionsPanel` "Cut Log Actions" dropdown deleted (held the bespoke "Enter Finalize Mode" toggle)

2. [apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx](../apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx) — restructured to consume props from section:
   - No more `useWorkOrderItemPendingCutLogs` (state lives at section)
   - No more `useWorkOrderCutLogVoid` (also lifted)
   - Per-row Save Pending Cuts / Discard buttons removed. Add Pending Cut button stays (per-WOMI affordance is required for adding to a specific WOMI)
   - Always-visible-when-clean checkboxes (drops the toggle): every PENDING server row gets a `CheckboxCell` gated by `canToggleSelection`
   - Section-wide cell-edit lock via `sectionBusy` prop (`isSelectionActive || isSavingPendingCuts || isFinalizingInFlight`) — pending edits + waste flag + notes all lock during these states
   - Per-row Void uses `ConfirmActionButton`. `editable={!sectionBusy && !voider.isVoiding}` — void blocks during save / finalize / selection-active for the whole section (user request); per-row blocks already-in-flight voids

3. [apps/web/modules/work-orders/controllers/use-work-order-item-pending-cut-logs.ts](../apps/web/modules/work-orders/controllers/use-work-order-item-pending-cut-logs.ts) — stripped from a 207-line hook + type to a type-only file (28 lines). `PendingCutLogRow` type retained to keep existing imports across the WO module resolving. File name is now historical; comment notes a post-V1 rename/relocation pass.

### Side effects worth noting

- **Collapsing a WOMI no longer destroys unsaved cut-log drafts.** State lives at the section level (Map indexed by `workOrderItemId`); collapse just hides the row, expand re-renders against the same state. This is a UX improvement, not a regression. Edits persist across expand/collapse for the duration of the session.
- **Action header now uses canonical `ActionHeader` primitive** instead of the bespoke header div. Brings the WOMI section visually in line with imports + other sections that use ActionHeader. No consumer-facing changes besides layout polish.
- **MI Save / Discard / Add Material Item buttons all disable when `isSelectionActive`.** Same lock model as imports — the user is either selecting or editing, never both.

### Verification

- ✅ `npm run typecheck` — full chain green (guard:prisma + 7 workspaces). One ts2322 hit on first pass: `voider.voidCutLog` returns `Promise<{cutLog}>` but `ConfirmActionButton.onConfirm` wants `Promise<void>`; wrapped in an async closure that discards the return value.
- ⏳ Dev-server smoke deferred to Sweep 4d (the next commit). Smoke plan from the master plan still applies.

### Out-of-scope cleanup (deferred)

- `apps/web/modules/work-orders/controllers/use-work-order-item-pending-cut-logs.ts` is now misnamed (type-only file, no `use*` hook). Rename / relocate post-V1.
- The `PendingCutLogRow` UI projection type duplicates `@builders/domain`'s `CutLogRow` with field omissions. Could be derived (`Pick<CutLogRow, ...>`) post-V1.
- The `useWorkOrderCutLogVoid` hook is small enough to inline into the new section-state hook in a future cleanup. Keeping separate for V1 to minimize churn.

### Suggested commit message

```
work-orders: WOMI cut-log section adopts shared batch-select + state lift (sweep 4c)

Cut-log dirty state lives at the section level so a single Save Pending
Cuts header button can fire saves across every dirty WOMI in one click,
and the always-visible-when-clean finalize checkboxes can gate cleanly on
section-wide dirty/busy signals.

Architecture
- New apps/web/modules/work-orders/controllers/use-work-order-cut-log-section-state.ts:
  Owns Record<workOrderItemId, { drafts, updates, deletes }>. Per-WOMI
  accessors (first arg is always womiId). Section-wide save mutation does
  Promise.all across dirty WOMIs. Empty entries auto-pruned so the dirty
  set is exactly Object.keys(stateByWomi).
- New apps/web/components/features/confirm-action/ — generic
  ConfirmActionButton primitive composing RowActionButton + ConfirmDialog
  with internal open + isFiring state. Async onConfirm keeps the dialog
  open while the action is in flight. Reusable for any destructive row
  action; mirrors the features/select-batch composite-primitive pattern.

Section UI
- WorkOrderMaterialItemsSection: bespoke header div replaced with the
  canonical ActionHeader. Six descriptor actions: Add MI, Discard MI,
  Save MI, Discard Pending Cuts, Save Pending Cuts, Finalize Selected.
  SelectAllButton in the extraActions slot. Bespoke
  useWorkOrderCutLogFinalize replaced with useGatedBatchSelect over the
  flattened cut-log array. Old ActionsPanel "Cut Log Actions" dropdown
  removed.
- WorkOrderCutLogRow: no longer instantiates its own controller; consumes
  cut-log state via props from the section. Per-row Save Pending Cuts /
  Discard removed (one section-level pair replaces them). Always-visible
  checkboxes on PENDING rows gated by canToggleSelection (drops the
  Enter Finalize Mode toggle). Per-row Void uses ConfirmActionButton.
- useWorkOrderItemPendingCutLogs.ts: stripped to a type-only export
  (PendingCutLogRow). File is now misnamed; rename / relocate post-V1.

Section-wide lock signals
- Cell edit lock + draft Add / Remove all gate on `sectionBusy`
  (isSelectionActive || isSavingPendingCuts || isFinalizingInFlight ||
  section.isSaving). Mirrors imports.
- Void button (per the user's added requirement): editable only when not
  sectionBusy and not already voiding another row. Section-wide scope
  matches the user's mental model — one click of Save Pending Cuts puts
  the whole section in saving state, locking every row's destructive
  actions until the producer routes return 202.

Side effect: collapsing a WOMI no longer destroys its unsaved cut-log
drafts. State lives at the section now, so collapse just hides the UI.
This is a UX improvement, not a regression.

Typecheck: full chain green.
```


---

## Sweep 4d — Verify domain invariant + dev-server smoke

_Not started._

---

## Sweep 5 — WO Files section UI (Phase 2c)

_Not started._

---

## Sweep 6 — Service variables → Railway

_Not started._
