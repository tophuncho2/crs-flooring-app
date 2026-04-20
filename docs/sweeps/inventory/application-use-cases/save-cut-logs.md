# saveInventoryCutLogsUseCase

`saveInventoryCutLogsUseCase(inventoryId: string, diff: CutLogsDiff, client?) → { inventory: InventoryDetailRecord, tempIdMap: Record<string,string> }`

## Use case

### What it does
Atomic section save for the **cut-logs child section** of an inventory record view. Add + modify + delete cut logs in one transaction. Every change must preserve `stockAvailable >= 0` against the parent inventory row's starting balance. Cut logs saved via this path have `inventoryId` required; `workOrderId` / `workOrderItemId` are optional (set via the row's cascading dropdown in the UI).

### Lock scope *(critical)*

**The inventory row and its touched cut-log rows. Nothing else.** No work-order lock, no material-item lock — the inventory row is the stock-invariant owner.

1. `SELECT id FROM flooring_inventory WHERE id = $1 FOR UPDATE` — the single parent. Holds across the whole transaction.
2. `SELECT id FROM flooring_cut_log WHERE id = ANY($1) ORDER BY id FOR UPDATE` — modified + deleted cut-log ids. Skip if empty.

Added cut logs have no id yet → not individually locked. The inventory-row lock protects the insertion (no concurrent writer can sneak a colliding cut log past it).

### Transport guard
- Envelope: `assertExpectedUpdatedAt` against inventory snapshot.
- Per-row: `expectedUpdatedAt` on each `modified` / `deleted` cut-log entry inside the diff.

### Orchestration
1. Open transaction.
2. Lock parent inventory row.
3. Lock touched cut-log rows (modifies + deletes) ordered by id.
4. Load `existing` cut logs via `listCutLogsByInventory(inventoryId, tx)` and `inventory` snapshot (already held from the lock-then-read).
5. `canAddCutLog(inventory)` gate — if any `added[]` entries exist and the gate fails, throw `CUT_LOG_INVENTORY_NOT_IMPORTED`.
6. `validateCutLogsDiff(diff, existing, { kind: "inventory", id: inventoryId })` — cut-logs domain validator: arithmetic invariant, status enum, linking rules, structural shape, per-row `expectedUpdatedAt`.
7. Build post-diff cut-log projection (original minus `deleted`, with `modified.replacements`, plus `added`) and compute the post-diff cut total. Scalar-aggregate alternative inside the lock:
   ```sql
   SELECT COALESCE(SUM("cut"), 0) FROM flooring_cut_log WHERE "inventoryId" = $1;
   ```
   Combined with the diff's deltas, assert `computeStockAvailable({ stockCount, cutLogsCutTotal: postDiffTotal }) >= 0`. Throw `CUT_LOG_EXCEEDS_STARTING_BALANCE` if the diff would drive stock negative.
8. Assign tempIds → fresh uuids for added rows; accumulate into `tempIdMap`.
9. `applyInventoryCutLogsDiff(tx, prepared)`:
   - `DELETE FROM flooring_cut_log WHERE id = ANY($deletedIds)`
   - Batched `INSERT` for added rows (default `status = 'PENDING'`)
   - Per-row `UPDATE` for modified rows
10. Re-read `getInventoryDetailById(inventoryId, tx)` — normalizer recomputes `stockAvailable`, `awaitingCut`, `coverageAvailable` against the new cut-log set.

### Response
`{ inventory: InventoryDetailRecord, tempIdMap }`

### Concurrency guarantees
- Two concurrent cut-log saves on the **same** inventory row serialize on the row lock. Neither can read `stockAvailable` until the other commits — correct for stock math.
- Two saves on **different** inventory rows run fully in parallel.
- A concurrent `saveWorkOrderMaterialItemsUseCase` that targets the same inventory row acquires the **same** `flooring_inventory FOR UPDATE` lock. The two paths serialize cleanly on that shared lock, preserving the stock invariant across entry points.

## Domain

### `canAddCutLog(inventory)` *(inventory domain)*
Gate: `inventory.isImported === true`. Throws `InventoryExecutionError({ code: "CUT_LOG_INVENTORY_NOT_IMPORTED", status: 409 })` when any `added[]` entry is requested against an unimported row.

### `validateCutLogsDiff(diff, existing, parent: { kind: "inventory", id })` *(cut-logs domain)*
Structural + per-row arithmetic: `before − cut === after` on every added / modified entry. Status enum via `isCutLogStatus`. Linking rules for the `"inventory"` parent kind — `inventoryId` must equal `parent.id`; optional `workOrderId` / `workOrderItemId` consistent when both set. Stranded modifies / deletes rejected.

### `computeStockAvailable({ stockCount, cutLogs })` *(inventory domain)*
Returns `stockCount − SUM(cutLogs.cut)` (cuts counted regardless of status). Asserts `>= 0`; throws `CUT_LOG_EXCEEDS_STARTING_BALANCE` on violation. In this use case the assertion runs against the **post-diff** projection inside the lock — never a pre-lock snapshot.
