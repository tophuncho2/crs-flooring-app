# V1 Master Execution Log — Sweeps 4-6

**Branch:** `staging` · **Plan:** [`sessions/v1-master-plan.md`](v1-master-plan.md) · **Started:** 2026-04-30

This file is updated after each sweep (and per sub-step within Sweep 4) ships. Sweeps 1-3 + ad-hoc imports work archived at [`sessions/sweeps-1-3/`](sweeps-1-3/).

---

## Status

| # | Sweep | Status | Date | Commit(s) |
|---|---|---|---|---|
| 4a | Decommission inventory-side cut-log routes + workers | 🟡 Code shipped, awaiting commit | 2026-04-30 | _(pending)_ |
| 4b | Inventory cut-logs section → read-only viewer | ⬜ Not started | — | — |
| 4c | WOMI cut-log UI redesign + adopt shared batch-select | ⬜ Not started | — | — |
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

_Not started._

---

## Sweep 4c — WOMI cut-log UI redesign + adopt shared batch-select

_Not started._

### Adoption plan (pre-execution sketch)
- Replace `useWorkOrderCutLogFinalize` with `useGatedBatchSelect` (consumed in `use-work-order-material-items-section.ts`)
- Section header: `Save Pending Cut Logs` (descriptor action) + `SelectAllButton` (`extraActions` slot) + `Finalize Selected (N)` (descriptor action, gated on `eligibleSelectedIds.length > 0`)
- Per-row Void button on cut-log rows + `ConfirmDialog`
- Cell editability: `!locked && !isSelectionActive` (mirrors imports section pattern)
- Action button gating mirrors imports: `disabled || isSelectionActive` on Save Pending / Discard / Add Row

---

## Sweep 4d — Verify domain invariant + dev-server smoke

_Not started._

---

## Sweep 5 — WO Files section UI (Phase 2c)

_Not started._

---

## Sweep 6 — Service variables → Railway

_Not started._
