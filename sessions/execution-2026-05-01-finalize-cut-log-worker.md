# Execution — Finalize Cut Log Worker hardening

**Date:** 2026-05-01
**Plan:** [plan-2026-05-01-finalize-cut-log-worker.md](plan-2026-05-01-finalize-cut-log-worker.md)
**Audit:** [audit-2026-04-30-finalize-cut-log-worker.md](audit-2026-04-30-finalize-cut-log-worker.md)
**Predecessors:**
- [execution-2026-04-30-cut-log-before-after-nullable.md](execution-2026-04-30-cut-log-before-after-nullable.md) — schema migration that made before/after nullable
- [execution-2026-05-01-cut-log-unit-snapshots.md](execution-2026-05-01-cut-log-unit-snapshots.md) — unit-snapshot columns added (not consumed yet)

**Scope:** finalize worker only. Pending cut-log surface NOT touched (parallel session is reworking pending into per-row sync; this commit doesn't conflict with that work).

---

## What changed

Two files. ~120 lines net change.

| Layer | File | Change |
|---|---|---|
| Data | [packages/db/src/flooring/work-orders/cut-logs/write-repository.ts](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts) | `applyFinalizeWorkOrderCutLogBatch` now reads `startingStock` + existing `isFinal: true` cut logs (including voided-after-final) per touched inventory in two parallel batched queries; per inventory, walks the batch in `createdAt asc` and stamps `{status, isFinal, finalCutSequence, before, after}`; returns `{stampedRows: FinalizeStampedRow[]}` so the consumer can defensively assert |
| Application | [packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log-batch.ts](packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log-batch.ts) | Drops `recomputeAndPersistTotalCutSums` + `assertCutSumWithinStartingStock` (no-ops at finalize time); calls `assertBeforeCutAfterInvariant` per stamped row; `markFailed` swallow inside `markWorkOrderItemsFailedFromFinalizeBatch` now emits an `error`-level structured log; imports cleaned up |

---

## How `before` / `after` / `finalCutSequence` are computed

For each touched inventory, under the FOR UPDATE lock:

1. Read `startingStock` from `flooringInventory`.
2. Read every `isFinal: true` cut log on this inventory: `{cut, finalCutSequence, void}`.
3. Compute:
   - `existingFinalCutSum` = sum of `cut` over those rows where `void: false`. Voided-after-final rows contribute 0 (their `cut` is `"0"`).
   - `maxExistingSequence` = max `finalCutSequence` over **all** those rows (including voided-after-final). Voided rows keep their sequence, so the next allocation jumps over their slot — sequences are never reused.
4. Initialize the walk: `runningBalance = startingStock − existingFinalCutSum`, `nextSequence = maxExistingSequence + 1`.
5. Sort the batch's targets for this inventory by `createdAt asc`. For each target row in order:
   - `before = runningBalance`
   - `after = before − cut`
   - Stamp the row: `status = FINAL`, `isFinal = true`, `finalCutSequence = nextSequence`, `before`, `after`.
   - Advance: `runningBalance = after`, `nextSequence += 1`.

Pending cuts (and other PENDING rows on the same inventory not in this batch) are not part of the walk. They remain `before = null, after = null, finalCutSequence = null` until they themselves get finalized.

The data layer returns the stamped values as `{stampedRows: Array<{id, before, cut, after}>}`. The consumer calls `assertBeforeCutAfterInvariant` on each — pure check, no I/O, throws on arithmetic drift.

---

## Why `recomputeAndPersistTotalCutSums` and the `≤ startingStock` invariant assertion were dropped

At finalize time, no `cut` value changes. We only flip status, set `isFinal`, allocate `finalCutSequence`, and stamp `before`/`after`. The set of non-void cuts that contribute to `inventory.totalCutSum` is identical pre- and post-finalize. So:

- `recomputeAndPersistTotalCutSums` would compute the same number it already had and write it again — wasted query + wasted write.
- `assertCutSumWithinStartingStock` would compare the same numerator against the same denominator — invariant trivially preserved by inputs not changing.

Both calls are gone from the consumer. The pending worker keeps them because it actually mutates `cut` values and `void` flags.

---

## Query count change

Before:
- 1 read for batch targets
- 1 read for inventory startingStock (inside the dropped invariant block)
- N reads for max-sequence (`findFirst` per inventory inside the loop)
- 1 read inside `recomputeAndPersistTotalCutSums` (`listCutLogsForInventoryIds`)
- N inventory updates (inside `recomputeAndPersistTotalCutSums`)
- M cut-log updates (one per row in the batch)
- N WOMI updates

Total: ~`3 + 2N + M` queries.

After:
- 1 read for batch targets
- 2 reads in parallel: inventory startingStock + existing isFinal cut logs across all touched inventories
- M cut-log updates (one per row in the batch)
- N WOMI updates

Total: ~`3 + N + M` queries.

For a finalize batch touching ≥ 2 inventories, query count drops. For a single-inventory batch (most common case in dev), about even — but the wasted-write semantics of the recompute are gone regardless.

---

## Verification

| Check | Result |
|---|---|
| `npm run build --workspace @builders/db` (incl. `prisma generate`) | ✅ clean |
| `npm run typecheck` (root, all 8 packages: `lib`, `db`, `pdf`, `application`, `web`, `relay`, `worker`, plus Next.js typegen) | ✅ all clean |

**Runtime verification (deferred — needs you to drive the UI):**
- Restart `dev:worker` so it picks up the rebuilt `@builders/db` dist.
- Add 2-3 pending cuts on a single inventory under one WOMI. Save them.
- Click Finalize Selection on all of them.
- Confirm:
  - Each row flips to FINAL.
  - `before`/`after` walk correctly: first row's `before = startingStock`, `after = before − cut`; second row's `before` matches first's `after`; etc.
  - `finalCutSequence` allocates 1, 2, 3, ... per inventory.
- Add another pending cut, void one of the FINAL rows, then finalize the new cut. Confirm the new cut's `finalCutSequence` skips the voided row's slot (e.g. allocates 4 if the voided row was 3) and the running balance correctly excludes the voided cut's contribution.

---

## Behavioral notes

- **Existing FINAL rows in the DB are not re-stamped.** Only the batch's PENDING targets are updated. Historical FINAL rows keep whatever `before`/`after` they were stamped with by the old (pre-fix) code — those values used to be set at pending-time with running-balance-including-pending semantics. Per locked decision, that drift is accepted; the rows are historical snapshots and won't be re-walked. (User indicated they'd be wiping cut logs anyway.)
- **Pending cut log code is not touched.** The parallel session can refactor pending without conflict.
- **WOMI status flow** (`FINALIZING → IDLE` on success, `... → FAILED` on throw) is unchanged.
- **Idempotency under retry:** if the worker fails after writing some rows but before completing, the TX rolls back — no partial stamps. On retry, the same batch is reprocessed. The retry sees the same PENDING rows, runs the same walk, gets the same numbers, applies the same updates. End-state idempotent.
- **`assertBeforeCutAfterInvariant` defensive check:** added per stamped row. Pure computation. If the data layer's running-balance walk ever produces inconsistent `before − cut === after`, the consumer throws and the TX rolls back before the worker reports success. Floating-point tolerance baked into the rule.

---

## What didn't change

- `lockInventoriesForCutLogBatch` — unchanged.
- Producer use case `finalizeWorkOrderCutLogBatchUseCase` — unchanged.
- Outbox topic + relay + BullMQ queue — unchanged.
- Worker processor `processFinalizeWorkOrderCutLogBatchJob` — unchanged.
- Re-validation logic in the consumer (linkage check, `canFinalizeCutLog`, `getCutLogFinalizabilityBlocker`) — unchanged.
- WOMI status transitions (producer flips IDLE → FINALIZING; consumer flips FINALIZING → IDLE) — unchanged.
- Pending cut log surface — entirely untouched.

---

## Commit message (do not commit yet)

```
worker: harden WO-side finalize cut-log worker

The finalize worker now:
- Stamps `before` / `after` on each row in the batch via a per-inventory
  chronological walk. Running balance starts at
  `startingStock − sum(existing FINAL non-void cuts on this inventory)`
  and decreases by each cut's value as the walk proceeds.
- Allocates `finalCutSequence` from `max(existing finalCutSequence over
  isFinal=true rows) + 1`, INCLUDING voided-after-final rows. Voided
  rows keep their sequence — never reused. The walk processes the
  batch's rows in createdAt asc per inventory.
- Defensively asserts `before − cut === after` per stamped row in the
  consumer via the existing domain invariant
  `assertBeforeCutAfterInvariant`.

Drops `recomputeAndPersistTotalCutSums` + `assertCutSumWithinStartingStock`
from the consumer. Cut values don't change at finalize, so totalCutSum
is invariant pre/post and both calls are no-ops. Saves a query on
single-inventory batches and removes wasted writes on multi-inventory
batches.

Replaces the silent `markFailed` swallow inside
`markWorkOrderItemsFailedFromFinalizeBatch` with an error-level
structured log carrying `workOrderItemId` and the serialized error.
Mirrors the pending worker's pattern. Original failure flows to BullMQ
unchanged; the loop continues over remaining WOMIs.

Schema is already correct (`before` / `after` nullable from earlier
today). No schema change in this commit.

Pending cut-log surface is not touched — the parallel session's per-row
refactor of pending mutations is independent of this work.

Plan: sessions/plan-2026-05-01-finalize-cut-log-worker.md
Execution: sessions/execution-2026-05-01-finalize-cut-log-worker.md
Audit: sessions/audit-2026-04-30-finalize-cut-log-worker.md
```

---

## Next

Per the [next-steps checklist](session-12/sweep-4/next-steps-checklist.md):

- [x] Verify the **pending cut log worker** ← prior commit (now being reworked into per-row sync in parallel session)
- [x] Verify the **finalize cut log worker** ← this commit
- [ ] Re-audit the **void flow** — should be largely OK as-is (still synchronous, single-row, locks parent inventory)
- [ ] Complete the **PDF generation worker** job
- [ ] Update the **service variables** (sweep 6)
