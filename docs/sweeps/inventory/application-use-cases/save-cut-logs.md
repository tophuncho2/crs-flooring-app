# saveInventoryCutLogsUseCase

`saveInventoryCutLogsUseCase(inventoryId: string, diff: CutLogsDiff, client?) → { inventory: InventoryDetailRecord, tempIdMap: Record<string,string> }`

## What it does
Atomic section save for the **cut-logs child section** of an inventory record view. Add + modify + delete cut logs in one transaction. Every change must preserve `stockAvailable >= 0` against the parent inventory row's starting balance. Cut logs created via this path have `inventoryId` required and `workOrderId` / `workOrderItemId` optional — the cascading dropdown (work-order → material-item) in the row UI writes these optionally.

## Lock scope *(critical)*

**The inventory row and its touched cut-log rows. Nothing else.** No work-order lock, no material-item lock — the inventory row is the stock-invariant owner.

1. `SELECT id FROM flooring_inventory WHERE id = $1 FOR UPDATE` — the single parent. Holds across the whole transaction.
2. `SELECT id FROM flooring_cut_log WHERE id = ANY($1) ORDER BY id FOR UPDATE` — modified + deleted cut-log ids. Skip if empty.

Added cut logs have no id yet → not individually locked. The inventory-row lock protects the insertion (no concurrent writer can sneak a colliding cut log past it).

## Transport guard (pre-transaction)
- Envelope: `assertExpectedUpdatedAt` against inventory snapshot — catches "inventory row was edited / deleted since you loaded it".
- Per-row: `expectedUpdatedAt` on each `modified` / `deleted` cut-log entry inside the diff — catches within-section concurrent edits.

## Domain rules orchestrated

### `canAddCutLog(inventory)` — gate on every added cut log
Rule: `inventory.isImported === true`. If any `added[]` entry exists and the gate fails, throws `CUT_LOG_INVENTORY_NOT_IMPORTED`.

**Data-layer action**: reads from the `inventory` record already loaded via the row lock — no extra query.

### `validateCutLogsDiff(diff, parent: { kind: "inventory", id })`
Structural + per-row arithmetic: `before − cut === after` on every added / modified entry. Enum guard `isCutLogStatus(status)` on every entry. Stranded modifications / deletes (ids not in loaded cut-log set) rejected.

**Data-layer action**: `listCutLogsByInventory(id, tx)` once inside the lock to supply `existing` to the validator.

### `computeStockAvailable({ stockCount, cutLogs: postDiffProjection })` — invariant re-check
After the structural validator passes, the use case computes the **post-diff** projected cut-log set (original minus `deleted`, with `modified.replacements`, plus `added`), runs `computeStockAvailable`, and asserts the result is `>= 0`. **Uses the freshly loaded totals from inside the lock — never a pre-lock snapshot.**

**Data-layer action**: the freshly-loaded list from the prior step already has everything needed. At scale the list can be replaced with a scalar aggregate inside the lock:
```sql
SELECT COALESCE(SUM("cut"), 0) FROM flooring_cut_log WHERE "inventoryId" = $1;
```
Combined with the diff's deltas (`− sum(deleted.cut) + sum(modified.replacement.cut − modified.original.cut) + sum(added.cut)`), the aggregate is enough. Throws `CUT_LOG_EXCEEDS_STARTING_BALANCE` with the offending `inventoryId` on violation.

### TempId → uuid assignment
Every `added[].tempId` gets a fresh uuid; mapping accumulated in `tempIdMap`.

**Data-layer action**: none.

## Transaction flow
1. Open transaction.
2. Lock parent inventory row.
3. Lock touched cut-log rows (modified + deleted) ordered by id.
4. Load `existing` cut logs + `inventory` snapshot.
5. `canAddCutLog` gate if any adds.
6. `validateCutLogsDiff`.
7. Build post-diff projection → `computeStockAvailable` assertion against fresh totals.
8. Assign tempIds → uuids.
9. `applyInventoryCutLogsDiff(tx, prepared)`:
   - `DELETE FROM flooring_cut_log WHERE id = ANY($deletedIds)`
   - Batched `INSERT` for added rows (default `status='PENDING'`)
   - Per-row `UPDATE` for modified rows
10. Re-read `getInventoryDetailById(inventoryId, tx)` — normalizer recomputes `stockAvailable`, `awaitingCut`, `coverageAvailable` against the new cut-log set.

## Response
`{ inventory: InventoryDetailRecord, tempIdMap }`

## Concurrency guarantees
- Two concurrent cut-log saves on the **same** inventory row serialize on the row lock. Neither can read `stockAvailable` until the other commits — correct for stock math.
- Two saves on **different** inventory rows run fully in parallel.
- A concurrent `saveWorkOrderMaterialItemsUseCase` save that targets the same inventory row (via nested cut-log children of a material item) locks **the same** `flooring_inventory` row with `FOR UPDATE` — the two paths serialize cleanly on that shared lock, preserving the stock invariant across entry points.
