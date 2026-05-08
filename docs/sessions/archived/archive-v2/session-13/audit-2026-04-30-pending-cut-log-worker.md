# Audit — Pending Cut Log Worker (WOMI section)

**Date:** 2026-04-30
**Scope:** Full path from "Save Pending Cuts" click → row persisted in DB. Producer + outbox + relay + worker + consumer + data + domain layers, plus the inventory-side display gap that surfaces the same data.
**Trigger topic:** `flooring.work-order-item.pending-cut-log.save`
**BullMQ queue:** `flooring-work-order-item-pending-cut-log-diff`

---

## Trace — what fires when the user clicks "Save Pending Cuts"

| # | Layer | File | What happens |
|---|---|---|---|
| 1 | UI state | [apps/web/modules/work-orders/controllers/use-work-order-cut-log-section-state.ts](apps/web/modules/work-orders/controllers/use-work-order-cut-log-section-state.ts) | `useWorkOrderCutLogSectionState.save()` → mutation kicks off; for each dirty WOMI builds a `{added, modified, deleted}` diff |
| 2 | Client mutation | [apps/web/modules/work-orders/data/mutations.ts](apps/web/modules/work-orders/data/mutations.ts) (`saveWorkOrderItemPendingCutLogDiffRequest`) | One PATCH per dirty WOMI in `Promise.all`; client-generated `requestKey` UUID for idempotency |
| 3 | API route | [apps/web/app/api/work-orders/\[id\]/material-items/\[itemId\]/pending-cut-logs/section/route.ts](apps/web/app/api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/section/route.ts) | `applyRoutePolicy` → `validateWorkOrderItemPendingCutLogDiffInput` → `enforceMutationReceipt` → producer use case → 202 |
| 4 | **Producer use case** | [packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts](packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts) | In one TX: read WOMI → assert workOrderId matches → assert status transition `IDLE → SAVING_CUTS` → stamp draft UUIDs → assert linkage symmetry → mark WOMI `SAVING_CUTS` → write outbox event |
| 5 | Outbox row | `flooring_outbox_event` (PG table) | `topic = flooring.work-order-item.pending-cut-log.save`, `aggregateType = FlooringWorkOrderItem`, `idempotencyKey = wo-pcl-diff:<womiId>:<requestKey>` |
| 6 | Relay | `apps/relay/src/...` (poll loop, 2s interval, batch 20) | Reads PENDING outbox events, marks PROCESSING, dispatches to BullMQ queue, marks DISPATCHED on success |
| 7 | BullMQ | Redis-backed `flooring-work-order-item-pending-cut-log-diff` queue | Concurrency 1, lock duration 60 s |
| 8 | Worker processor | [apps/worker/src/processors/save-work-order-item-pending-cut-log-diff.ts](apps/worker/src/processors/save-work-order-item-pending-cut-log-diff.ts) | `parsePayload` → `applyPendingCutLogDiff(payload)` → on throw: `markFailed(womiId)` then classify (`UnrecoverableError` vs retry) |
| 9 | **Consumer use case** | [packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts](packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts) | In one TX: derive touched inventory ids → multi-inventory FOR UPDATE lock → apply diff (creates/updates/deletes) → recompute `totalCutSum` → assert `≤ startingStock` → mark WOMI `IDLE` |
| 10 | Data write | [packages/db/src/flooring/work-orders/cut-logs/write-repository.ts](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts) (`applyWorkOrderItemCutLogPendingDiff`, `lockInventoriesForCutLogBatch`, `recomputeAndPersistTotalCutSums`) | `flooringCutLog.deleteMany` for deletes; `createMany` for drafts; per-id `update` for modifies; `flooringInventory.update` for new totalCutSum |
| 11 | WOMI status | `markWorkOrderItemStatus(womiId, "IDLE")` | Final state — `SAVING_CUTS → IDLE` (success) or `SAVING_CUTS → FAILED` (catch path in fresh TX) |

---

## Open questions

1. **Schema migration: make `before` and `after` nullable?**
   To stop computing them at pending time, the columns must accept null. Today both are `Decimal NOT NULL`. Per `CLAUDE.md` schema changes ship in their own commit. **Confirming: migrate to `Decimal? @db.Decimal(12, 2)` for both columns?** Existing FINAL/VOID rows already have non-null values; the migration is additive (drop NOT NULL).

2. **Coverage gating logic.** You said "only one of four categories". The repo's `CATEGORY_UNIT_RULES` ([packages/domain/src/flooring/categories/rules.ts:3-8](packages/domain/src/flooring/categories/rules.ts:3)) actually flags **all four** of `vinyl-plank`, `carpet-tile`, `covebase`, `pad` with `hasCoverageUnit: true` (other categories default to false). **Confirming: every inventory whose `categorySlug` is in that set + has non-null `coveragePerUnit` should get a derived `coverageCut`?** (Domain helper `computeCutCoverage` already exists.)

3. **Update path coverage re-derivation.** When the user edits a pending row's `cut` value, should the worker re-derive `coverageCut` (from the same inventory's `coveragePerUnit`)? **Assumed yes** — coverageCut tracks cut and would otherwise drift after an edit.

4. **Void preservation under the new model.** Today `buildVoidedCutLogPatch` sets `cut: "0"` because the column is NOT NULL. If we leave `cut` NOT NULL but make `before/after` nullable, void semantics stay the same. **Confirming: don't make `cut` nullable — keep `cut: "0"` on void.** (You said voiding "removes the cut" which I'm reading as zero-out, not null.)

5. **Delete-final guard.** Today nothing prevents a WO-side pending-diff from listing a FINAL row in `deletes` — `assertCutLogDeleteAllowed` exists in domain but **has zero callers**. The data layer just runs `deleteMany` on whatever ids the payload supplies. **Confirming: producer should call `assertCutLogDeleteAllowed` per delete entry (or the consumer should re-assert under the lock). I recommend the consumer, since the lock guarantees the row's status hasn't drifted.**

6. **Sequence allocation under retry.** `cutLogNumber` is DB-generated by sequence. If a worker job retries (BullMQ default), the `createMany` re-runs against the same draft UUIDs (idempotent on PK conflict — second attempt is a no-op). The sequence is NOT consumed twice because the row already exists. **Confirming behavior is correct as-is** — flagging because it's worth understanding before shipping.

7. **Should `before/after` ever be set on PENDING rows for any reason** (e.g., display preview)? Inventory-side cut-log section shows `before/after` columns. If pending rows have null, those cells would render `—` until finalize. **Confirming that's acceptable UX.**

---

## What's currently wrong

| # | Severity | Issue | File |
|---|---|---|---|
| 1 | 🔴 | Worker computes `before` and `after` at pending time. Should be null until finalize. | [write-repository.ts:113-128](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts:113) |
| 2 | 🔴 | Worker hardcodes `coverageCut: null` on every draft. Should derive from inventory if the category has a coverage unit. | [write-repository.ts:129](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts:129) |
| 3 | 🔴 | Update path doesn't re-derive `coverageCut` when `cut` changes. | [write-repository.ts:147-158](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts:147) |
| 4 | 🟡 | Schema requires `before` and `after` to be NOT NULL — blocking #1. Migration needed (separate commit). | [packages/db/prisma/schema.prisma:394, 397](packages/db/prisma/schema.prisma) |
| 5 | 🟡 | Nothing prevents `deletes[]` from including a FINAL cut log id. `assertCutLogDeleteAllowed` exists but has zero callers. | [packages/domain/.../cut-log-rules.ts:61](packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:61) (dead) + [write-repository.ts:75-78](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts:75) (no guard) |
| 6 | 🟢 | `assertCutLogLinkageSymmetry` is called inside the per-draft loop with constant args — not per-draft. Cosmetic. | [save-work-order-item-pending-cut-log-diff.ts:85-94](packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts:85) |
| 7 | 🟢 | Catch path `markFailed` swallows all errors silently → stuck-state risk if FAILED-marker write itself fails. | [apply-work-order-item-pending-cut-log-diff.ts:99-108](packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts:99) |
| 8 | 🟢 | Inventory-side cut-log section displays raw `workOrderId` UUID and a redundant raw `workOrderItemId` UUID column. Should show `workOrderNumber`; remove the Material Item column entirely. UI-only. | [apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx:23-24, 131-146](apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx:23) |

---

## Per-file audit

### [packages/db/src/flooring/work-orders/cut-logs/write-repository.ts](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts)

The hot file. `applyWorkOrderItemCutLogPendingDiff` carries the create-row construction at lines 113-138:

```ts
createRows.push({
  id: draft.id,
  inventoryId,
  workOrderId: input.workOrderId,
  workOrderItemId: input.workOrderItemId,
  before: before.toFixed(2),     // ❌ should be null
  cut: draft.cut,
  after: after.toFixed(2),       // ❌ should be null
  coverageCut: null,             // ❌ should be derived if coveragePerUnit set + category supports
  status: "PENDING",
  isFinal: false,
  finalCutSequence: null,
  cost: null,                    // ✅
  freight: null,                 // ✅
  isWaste: draft.isWaste,
  void: false,
  notes: draft.notes ? draft.notes : null,
})
```

The pre-loop machinery (lines 87-104) computes a per-inventory `runningRemaining` for the before/after derivation. **All of that goes away** under the new model — drafts only need `cut`, `coverageCut` (if applicable), `isWaste`, `notes`, plus the linkage and status defaults.

The update path at lines 147-158 is shape-correct but missing coverageCut re-derivation:

```ts
data: {
  ...(update.patch.cut !== undefined ? { cut: update.patch.cut } : {}),
  ...(update.patch.isWaste !== undefined ? { isWaste: update.patch.isWaste } : {}),
  ...(update.patch.notes !== undefined ? { notes: ... } : {}),
}
```

When `cut` changes, the worker should also recompute `coverageCut` from `inventory.coveragePerUnit`. Means we need the inventory snapshot inside the update branch too (or pass coveragePerUnit through to each update via a pre-read).

`lockInventoriesForCutLogBatch` (lines 15-26) was fixed earlier today — now uses the standard single-id `Prisma.sql FOR UPDATE` pattern looped per id. ✅

`recomputeAndPersistTotalCutSums` (lines 222-250) is correct as-is. Computes `totalCutSum` from non-void rows via the pure domain helper, persists per-inventory. Used by both pending and finalize today (we'll keep it for pending; remove call from finalize per the finalize audit).

### [packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts](packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts)

Consumer. Flow shape is right; the only change is **the data layer needs the inventory snapshot to derive coverageCut**, and that snapshot needs to come from the same locked TX. Two options:

- **Pass coverage data through to `applyWorkOrderItemCutLogPendingDiff`.** Read `{id, categorySlug, coveragePerUnit}` for each touched inventory in the consumer (under the lock), pass as a Map or per-draft enrichment to the data function. Cleaner — keeps the data function deterministic on its inputs.
- **Have the data function read it itself.** Adds a query inside the data layer; mixes responsibilities. Worse.

Recommend the first.

The `markFailed` swallow at lines 99-108 is unchanged scope-wise — note it as a stuck-state risk follow-up.

### [packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts](packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts)

Producer. Correct. Two cosmetic items (issues #5/#6 above are about other files; this one's only nit is the per-draft `assertCutLogLinkageSymmetry` loop call with constant args).

### [apps/worker/src/processors/save-work-order-item-pending-cut-log-diff.ts](apps/worker/src/processors/save-work-order-item-pending-cut-log-diff.ts)

Processor. Correct. No changes needed for this audit.

### [apps/web/app/api/work-orders/\[id\]/material-items/\[itemId\]/pending-cut-logs/section/route.ts](apps/web/app/api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/section/route.ts)

API route. Correct. No changes.

### [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma)

`FlooringCutLog.before` and `FlooringCutLog.after` (lines 394, 397) need to flip to nullable. Same column type, same precision, just drop NOT NULL. **Schema-only commit** per CLAUDE.md.

### [packages/domain/src/flooring/categories/conversions.ts](packages/domain/src/flooring/categories/conversions.ts) + [packages/domain/src/flooring/inventory/cut-logs/category-math.ts](packages/domain/src/flooring/inventory/cut-logs/category-math.ts)

Pure helpers that already do the right thing. `computeCutCoverage({cut, coveragePerUnit, category})` returns null when either coverage-per-unit is null or category lacks a coverage unit. **No changes — just call it.**

### [apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx](apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx)

UI-only. Two changes:
- Line 24: drop the `workOrderItem` column entirely.
- Lines 131-138: change Work Order column to render `workOrderNumber` (e.g. "WO-00123") instead of the raw UUID. Means the loader for the inventory record needs to surface `workOrderNumber` on each cut log row (today it only carries `workOrderId`). Sub-fix in the inventory module's data/queries layer.

### [packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts](packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts)

`assertCutLogDeleteAllowed` (line 61) is defined but has zero callers. The intent is to prevent deletes against FINAL cut logs. Either:
- Wire it into the consumer (call per delete entry, under the lock — the lock guarantees no race on status), OR
- Add a producer-time validator (rejects the request before enqueue).

Recommend the consumer wire-up — survives any drift between producer and consumer time and keeps the producer simpler.

`assertBeforeCutAfterInvariant` (line 31) is also defined but has zero callers. Once the finalize worker stamps `before/after`, that worker should call this rule per stamped row as a defensive check. Out of scope here; called out in the finalize audit.

---

## Summary table — what changes by layer for the fix

| Layer | Change |
|---|---|
| Schema | Make `before` and `after` nullable. **Own commit.** |
| Domain | No new code (helpers already exist: `computeCutCoverage`, `assertCutLogDeleteAllowed`). |
| Data | `applyWorkOrderItemCutLogPendingDiff` accepts a per-inventory coverage snapshot. Stops writing `before`/`after`. Derives `coverageCut` per draft. Update path also re-derives. |
| Application | Consumer reads `{id, categorySlug, coveragePerUnit}` per touched inventory under the lock and passes the snapshot to the data function. Optionally calls `assertCutLogDeleteAllowed` per delete. |
| Worker | No code change. |
| API | No code change. |
| UI (inventory side) | Drop Material Item column; render Work Order column as `workOrderNumber`. Loader change to surface `workOrderNumber` per cut log row. |
