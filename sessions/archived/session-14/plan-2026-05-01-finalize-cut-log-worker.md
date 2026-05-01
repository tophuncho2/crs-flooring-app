# Plan — Finalize Cut Log Worker hardening

**Date:** 2026-05-01
**Audit:** [audit-2026-04-30-finalize-cut-log-worker.md](audit-2026-04-30-finalize-cut-log-worker.md)
**Predecessors:** schema migrations (`before`/`after` nullable; `cut_log_unit_snapshots`) already applied.
**Scope:** finalize worker only. Pending cut-log surface NOT touched (parallel session is reworking that into per-row sync; this plan is independent).

---

## Commit shape

One commit, two files:

| Layer | File | Change |
|---|---|---|
| Data | [packages/db/src/flooring/work-orders/cut-logs/write-repository.ts](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts) — `applyFinalizeWorkOrderCutLogBatch` | Read `startingStock` + existing FINAL/voided-final cut logs per touched inventory in two batched queries; per inventory, walk batch in `createdAt asc` and stamp `{status, isFinal, finalCutSequence, before, after}`; return per-row stamped values so the consumer can defensively assert |
| Application | [packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log-batch.ts](packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log-batch.ts) | Drop `recomputeAndPersistTotalCutSums` + `assertCutSumWithinStartingStock` (no-ops at finalize); call `assertBeforeCutAfterInvariant` per stamped row; `markFailed` swallow logs at error level |

Net change: ~120 lines.

---

## Data-layer rewrite — `applyFinalizeWorkOrderCutLogBatch`

### Inputs needed (under the lock)

1. **Batch targets** (existing query, expand select): `findMany({where: {id: {in: cutLogIds}}, select: {id, inventoryId, cut, createdAt}})`. Add `cut` to the existing select.
2. **Inventory startingStock** per touched inventory: `findMany({where: {id: {in: touchedInventoryIds}}, select: {id, startingStock}})`.
3. **Existing FINAL cut logs** per touched inventory: `findMany({where: {inventoryId: {in: touchedInventoryIds}, isFinal: true}, select: {inventoryId, cut, finalCutSequence, void}})`.
   - Replaces the per-inventory `findFirst` for max-sequence (was N queries — now 1).
   - Includes voided-after-final rows (their `cut` is `"0"`, contributes 0 to the FINAL cut sum; their `finalCutSequence` is preserved and counts toward `maxExistingSequence` so the next allocation skips voided slots).

### Walk per inventory

```ts
// Compute, in memory:
const existingFinalCutSum = sum(cut over rows where void = false)
const maxExistingSequence = max(finalCutSequence over all rows, 0 default)
let runningBalance = startingStock - existingFinalCutSum
let nextSequence = maxExistingSequence + 1

// Sort batch's rows for this inventory by createdAt asc, then per row:
for (const row of batchRowsForThisInventoryAsc) {
  const before = runningBalance
  const after = before - row.cut
  // UPDATE: status FINAL, isFinal true, finalCutSequence = nextSequence,
  //         before, after
  runningBalance = after
  nextSequence += 1
  // record {id, before, cut, after} into the return list
}
```

### Return shape

```ts
type FinalizeStampedRow = { id: string; before: string; cut: string; after: string }

export async function applyFinalizeWorkOrderCutLogBatch(
  tx: Prisma.TransactionClient,
  input: ApplyFinalizeWorkOrderCutLogBatchInput,
): Promise<{ stampedRows: FinalizeStampedRow[] }>
```

The data layer doesn't throw — keeps it free of business invariants per `packages/db/CLAUDE.md`. The consumer asserts.

---

## Application-layer rewrite — consumer

### Drop

- `recomputeAndPersistTotalCutSums(c, inventoryIds)` call (line 109)
- `assertCutSumWithinStartingStock` block (lines 110-122)
- The unused `recomputeAndPersistTotalCutSums` and `assertCutSumWithinStartingStock` imports

### Add

- Capture the `{stampedRows}` return from `applyFinalizeWorkOrderCutLogBatch`.
- For each stamped row: call `assertBeforeCutAfterInvariant({before, cut, after})`. Pure, costs nothing, catches arithmetic drift in CI/runtime.
- `assertBeforeCutAfterInvariant` import from `@builders/domain`.

### `markWorkOrderItemsFailedFromFinalizeBatch` — log on swallow

Mirror the pending worker's pattern. Inside the per-WOMI catch:

```ts
try {
  await markWorkOrderItemStatus(id, "FAILED", c)
} catch (err) {
  logStructuredEvent({
    level: "error",
    service: "builders-application",
    environment: process.env.NODE_ENV ?? "unknown",
    message: "Failed to mark WOMI FAILED after finalize-batch worker error — WOMI may be stuck in FINALIZING",
    action: "work_orders.cut_logs.finalize.mark_failed_failed",
    details: { workOrderItemId: id },
    error: err,
  })
}
```

`logStructuredEvent` import from `@builders/lib`.

---

## Order of operations in the consumer (post-fix)

1. Derive touched inventory ids from `payload.cutLogIds` (existing).
2. Lock those inventories ascending FOR UPDATE (existing).
3. Re-validate every selected row: linkage + `canFinalizeCutLog` + `getCutLogFinalizabilityBlocker` (existing).
4. Call `applyFinalizeWorkOrderCutLogBatch(c, {cutLogIds})` — captures `{stampedRows}`.
5. Per stamped row, call `assertBeforeCutAfterInvariant({before, cut, after})`. Throws on arithmetic drift → TX rolls back.
6. For each touched WOMI, `markWorkOrderItemStatus(womiId, "IDLE")` (existing).

`recomputeAndPersistTotalCutSums` and `assertCutSumWithinStartingStock` are gone — cut values don't change at finalize so totalCutSum is invariant pre/post.

---

## Verification

- `npm run build --workspace @builders/domain`
- `npm run build --workspace @builders/db`
- `npm run typecheck` (root, all 8 packages)
- Restart `dev:worker` so the rebuilt `@builders/db` dist is loaded.
- Manual smoke: open a WOMI with at least one PENDING cut, click Finalize Selection. Confirm:
  - Row flips to FINAL with stamped `before`/`after` matching the running balance over prior FINAL rows on that inventory.
  - `finalCutSequence` allocates as `max + 1`.
  - Voided-after-final rows on the same inventory keep their sequence (no reuse).
  - WOMI status returns to `IDLE`.

---

## Risk

- Schema is already correct (`before`/`after` nullable). Migration done.
- The data-layer change replaces one walk pattern with another; queries go from `1 + N` (one targets + N max-sequence findFirsts) to `3` (targets + inventories + existing-final cuts). Net query count drops for batches that touch >2 inventories.
- The dropped `recomputeAndPersistTotalCutSums` is a no-op at finalize per the locked decision — no behavior change other than cost reduction.
- Existing FINAL rows in the DB stay untouched; only the batch's PENDING rows get stamped.
- Pending worker code is not touched, so the parallel session's per-row pending refactor is independent.

---

## Out of scope

- Pending cut log mutations (parallel session)
- Void flow
- PDF worker
- UI controllers
- Inventory cut-log section UI cleanup (the `Material Item` column drop + WO column rendering)
