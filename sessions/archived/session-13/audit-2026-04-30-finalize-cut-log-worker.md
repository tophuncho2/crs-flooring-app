# Audit — Finalize Cut Log Worker (WOMI section)

**Date:** 2026-04-30
**Scope:** Full path from "Finalize Selection" click → cut logs flipped FINAL with `before`/`after`/`finalCutSequence` stamped. Producer + outbox + relay + worker + consumer + data + domain layers.
**Trigger topic:** `flooring.work-order.cut-log.finalize`
**BullMQ queue:** `flooring-work-order-cut-log-finalize`

---

## Trace — what fires when the user clicks "Finalize Selection"

| # | Layer | File | What happens |
|---|---|---|---|
| 1 | UI selection | [apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx](apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx) (`useGatedBatchSelect` finalize hook) | User checks pending rows; gated by `isPendingCutLogRow` predicate; collects selected `cutLogIds` |
| 2 | Client mutation | [apps/web/modules/work-orders/data/mutations.ts](apps/web/modules/work-orders/data/mutations.ts) | One POST with `{cutLogIds[], requestKey}`; client-generated `requestKey` UUID for idempotency |
| 3 | API route | [apps/web/app/api/work-orders/\[id\]/cut-logs/finalize/route.ts](apps/web/app/api/work-orders/[id]/cut-logs/finalize/route.ts) | `applyRoutePolicy` → `validateFinalizeWorkOrderCutLogBatchInput` → `enforceMutationReceipt` → producer use case → 202 |
| 4 | **Producer use case** | [packages/application/src/flooring/work-orders/cut-logs/finalize-work-order-cut-log-batch.ts](packages/application/src/flooring/work-orders/cut-logs/finalize-work-order-cut-log-batch.ts) | In one TX: read all referenced cut logs → validate workOrderId match per row → run `getCutLogFinalizabilityBlocker` + `canFinalizeCutLog` per row → derive touched WOMI set → assert `IDLE → FINALIZING` per WOMI → mark every touched WOMI `FINALIZING` → write outbox event |
| 5 | Outbox row | `flooring_outbox_event` (PG table) | `topic = flooring.work-order.cut-log.finalize`, `aggregateType = FlooringWorkOrder`, `idempotencyKey = wo-cl-finalize:<workOrderId>:<requestKey>` |
| 6 | Relay | `apps/relay/src/...` (poll loop, 2s interval, batch 20) | Reads PENDING outbox events, marks PROCESSING, dispatches to BullMQ queue, marks DISPATCHED on success |
| 7 | BullMQ | Redis-backed `flooring-work-order-cut-log-finalize` queue | Concurrency 1, lock duration 60 s |
| 8 | Worker processor | [apps/worker/src/processors/finalize-work-order-cut-log-batch.ts](apps/worker/src/processors/finalize-work-order-cut-log-batch.ts) | `parsePayload` → `applyFinalizeBatch(payload)` → on throw: `markFailed(cutLogIds)` (derives WOMI ids internally) then classify (`UnrecoverableError` vs retry) |
| 9 | **Consumer use case** | [packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log-batch.ts](packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log-batch.ts) | In one TX: derive touched inventory ids from cut log ids → multi-inventory FOR UPDATE lock → re-read each row, re-validate finalizability under the lock → apply finalize (flip status, stamp `finalCutSequence`) → recompute `totalCutSum` (no-op) → assert invariant (no-op) → mark every touched WOMI `IDLE` |
| 10 | Data write | [packages/db/src/flooring/work-orders/cut-logs/write-repository.ts](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts) (`applyFinalizeWorkOrderCutLogBatch`) | Per-inventory: read `max(finalCutSequence)` of FINAL rows; per-row update `{status: FINAL, isFinal: true, finalCutSequence: nextSequence++}` |
| 11 | WOMI status | `markWorkOrderItemStatus(womiId, "IDLE")` per touched WOMI | Final state — `FINALIZING → IDLE` (success) or `FINALIZING → FAILED` (catch path in fresh TX) |

---

## Open questions

1. **`before`/`after` computation order under the lock.** The natural order is: per inventory, sort the batch by `createdAt asc` (matches today's ordering for `finalCutSequence` stamping), then for each cut: `before = runningBalance`, `after = before - cut`, advance running balance. Initial `runningBalance` for the inventory = `startingStock - sum(prior FINAL non-void cut values)`. **Confirming this is the intended semantic** (vs. some other ordering like cutLogNumber asc or per-row creation order across inventories).

2. **Read path for `runningBalance`.** Two ways:
   - Read each touched inventory's `startingStock` + sum its existing FINAL non-void cuts under the lock.
   - Read `startingStock` and trust it minus the existing total of FINAL non-void cuts (computed inline from the cut log rows we already pulled for re-validation).
   The second is cheaper (no extra query). **Confirming OK to derive from in-memory data?**

3. **`assertBeforeCutAfterInvariant` enforcement.** The domain rule exists at [cut-log-rules.ts:31](packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:31) and has zero callers today. Once the finalize worker stamps `before`/`after`, **should it call this rule per stamped row as a defensive check?** Recommend yes — pure check, costs nothing, surfaces drift if the math goes wrong.

4. **Drop `recomputeAndPersistTotalCutSums` + `assertCutSumWithinStartingStock` from finalize.** Per your direction: cut values don't change at finalize time, so `totalCutSum` doesn't change either. Currently the consumer calls both ([apply-finalize:109-122](packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log-batch.ts:109)). **Confirming both calls should be deleted from this consumer?** (Pending consumer keeps them — that's the worker that adds/removes/edits cuts.)

5. **`workOrderItemId` always set on finalize-touched rows?** The consumer loops `touchedWorkOrderItemIds.add(row.workOrderItemId)` but skips null at line 81. Today linkage is set at producer-time pending-save and `assertCutLogLinkageSymmetry` enforces both-or-neither. **Confirming any FINAL row reachable here always has a workOrderItemId** (the finalizability predicate only allows PENDING-from-WO rows through). If yes, a stricter assertion at the top of the consumer would be a good guard.

6. **Status return after finalize.** Today every touched WOMI flips to `IDLE` regardless of whether all of its cut logs are now FINAL or not. **Confirming WOMI stays at IDLE post-finalize** (vs. some `READY_TO_GENERATE` state). If there's a future state to roll into, flag it now.

---

## What's currently wrong

| # | Severity | Issue | File |
|---|---|---|---|
| 1 | 🔴 | Finalize worker doesn't compute `before` / `after`. Per the design they should be set HERE, not at pending time. | [write-repository.ts:200-211](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts:200) (only sets status/isFinal/finalCutSequence) |
| 2 | 🟡 | Finalize consumer recomputes `totalCutSum` and asserts the `≤ startingStock` invariant — both are no-ops because cut values don't change at finalize time. Wasted work + extra query. | [apply-finalize-work-order-cut-log-batch.ts:109-122](packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log-batch.ts:109) |
| 3 | 🟢 | `assertBeforeCutAfterInvariant` exists but has zero callers. Once we stamp before/after here, this is the natural site to defensively assert. | [cut-log-rules.ts:31](packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:31) (rule definition); call site needed in [write-repository.ts](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts) or consumer |
| 4 | 🟢 | Catch path `markFailed` (in `markWorkOrderItemsFailedFromFinalizeBatch`) swallows individual errors silently. Same stuck-state risk as the pending worker's catch path. | [apply-finalize-work-order-cut-log-batch.ts:163-167](packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log-batch.ts:163) |

---

## Per-file audit

### [packages/db/src/flooring/work-orders/cut-logs/write-repository.ts](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts) — `applyFinalizeWorkOrderCutLogBatch` (lines 176-215)

The loop at lines 195-214:

```ts
for (const [inventoryId, rows] of targetsByInventory) {
  const maxSequenceRow = await tx.flooringCutLog.findFirst({
    where: { inventoryId, isFinal: true },
    orderBy: { finalCutSequence: "desc" },
    select: { finalCutSequence: true },
  })
  let nextSequence = (maxSequenceRow?.finalCutSequence ?? 0) + 1

  for (const row of rows) {
    await tx.flooringCutLog.update({
      where: { id: row.id },
      data: {
        status: "FINAL",
        isFinal: true,
        finalCutSequence: nextSequence,
      },
    })
    nextSequence += 1
  }
}
```

What's right:
- Per-inventory FOR UPDATE lock already taken by caller. ✅
- `max(finalCutSequence)` read under the lock. ✅
- `finalCutSequence` allocated `+1` per row in createdAt-asc order. ✅

What's missing:
- No `before` / `after` stamping. Need a per-inventory `runningBalance` analogous to the `nextSequence` accumulator:
  - Initialize from `startingStock - sum(existing FINAL non-void cuts)` for that inventory.
  - For each row in the batch: `before = runningBalance`, `after = before - row.cut`, advance.
  - Persist alongside `status/isFinal/finalCutSequence`.
- The `targets` read at lines 182-186 only selects `{id, inventoryId, createdAt}` — needs to also select `cut` for the running-balance math.

### [packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log-batch.ts](packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log-batch.ts) — Consumer

Flow shape is sound. Re-validation under the lock at lines 51-105 is good defensive practice (catches drift between producer time and consumer time).

Issue: the consumer fires `recomputeAndPersistTotalCutSums` (line 109) and then asserts the `≤ startingStock` invariant (lines 110-122). Neither is needed at finalize — totalCutSum is unaffected by status flips. **Delete both blocks** to remove the wasted query and the now-misleading assertion.

The startingStock + max(finalCutSequence) reads needed for the new before/after computation could happen in the data function (`applyFinalizeWorkOrderCutLogBatch`) itself — keep the consumer thin.

`markWorkOrderItemsFailedFromFinalizeBatch` at lines 145-170 is fine. Same silent-swallow pattern noted in the pending audit.

### [packages/application/src/flooring/work-orders/cut-logs/finalize-work-order-cut-log-batch.ts](packages/application/src/flooring/work-orders/cut-logs/finalize-work-order-cut-log-batch.ts) — Producer

Correct. Pre-validates every row's finalizability before any writes (good — fail-fast at producer prevents pointless outbox events). Transitions every touched WOMI to `FINALIZING` in the same TX as the outbox write. ✅

No changes needed for this audit.

### [apps/worker/src/processors/finalize-work-order-cut-log-batch.ts](apps/worker/src/processors/finalize-work-order-cut-log-batch.ts) — Processor

Correct. Same shape as the pending processor — `markFailed` first (resolves WOMI ids from cut log ids internally), then classify error for retry semantics. No changes needed.

### [apps/web/app/api/work-orders/\[id\]/cut-logs/finalize/route.ts](apps/web/app/api/work-orders/[id]/cut-logs/finalize/route.ts) — API route

Correct. Standard mutation lifecycle. No changes needed.

### [packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts](packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts)

`assertBeforeCutAfterInvariant` (line 31) is defined but has zero callers. Once we stamp before/after in the data layer, the consumer (or the data function itself) should call this per row as a defensive check. Pure function — costs nothing.

---

## Summary table — what changes by layer for the fix

| Layer | Change |
|---|---|
| Schema | None (the columns are already there; their nullability change is driven by the **pending** audit, not this one). |
| Domain | No new code. `assertBeforeCutAfterInvariant` already exists and gets a caller. |
| Data | `applyFinalizeWorkOrderCutLogBatch` becomes per-inventory: read `startingStock` + existing FINAL non-void cuts under the lock to seed `runningBalance`, then per-row stamp `{status, isFinal, finalCutSequence, before, after}` and advance the balance. |
| Application | Consumer drops `recomputeAndPersistTotalCutSums` + `assertCutSumWithinStartingStock` calls. Optionally calls `assertBeforeCutAfterInvariant` per stamped row (or the data layer does). |
| Worker | No code change. |
| API | No code change. |
| UI | None for this audit (covered in the pending audit). |
