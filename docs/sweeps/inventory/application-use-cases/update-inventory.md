# updateInventoryUseCase

`updateInventoryUseCase(id: string, input: InventoryForm, client?) → { inventory: InventoryDetailRecord }`

## What it does
Primary-section replace for one inventory row. Covers product change, location / warehouse reassignment, stock-count correction, dye-lot edit, `isImported` flip, cost / freight updates, notes.

## Lock scope
- `SELECT id FROM flooring_inventory WHERE id = $1 FOR UPDATE` — the single row being written.

## Transport guard (pre-transaction)
`assertExpectedUpdatedAt` against inventory snapshot.

## Domain rules orchestrated

### `stockCount >= 0`
**Data-layer action**: none.

### `assertLocationBelongsToWarehouse(location, input.warehouseId)`
If the user changes warehouse, the UI clears the location selector when inconsistent; the use case re-validates at the server boundary.

**Data-layer action**: `SELECT id, "warehouseId" FROM flooring_location WHERE id = $1` on the submitted `locationId`.

### `validateInventoryInput(input)`
Structural.

**Data-layer action**: `SELECT id FROM flooring_product WHERE id = $1` — product existence.

### Stock-count reduction guard
If the new `stockCount` is lower than current, the use case must verify `newStockCount >= sum(cutLogs.cut)` — reducing below existing cut totals would violate `stockAvailable >= 0`.

**Data-layer action**: scalar aggregate inside the lock:
```sql
SELECT COALESCE(SUM("cut"), 0) AS cut_total
FROM flooring_cut_log WHERE "inventoryId" = $1;
```
Throws `CUT_LOG_EXCEEDS_STARTING_BALANCE` if the reduction would make the invariant fail.

## Transaction flow
1. Open transaction, lock inventory row.
2. Load snapshot + re-assert `expectedUpdatedAt`.
3. Resolve product + (if set) location + warehouse.
4. Domain validation + stock-count reduction guard.
5. `updateInventory(tx, id, input)` → `UPDATE flooring_inventory SET ... WHERE id = $1`.
6. Re-read `getInventoryDetailById(id, tx)` — normalizer recomputes `stockAvailable` / `awaitingCut` / `coverageAvailable` against the new `stockCount`.

## Response
`{ inventory: InventoryDetailRecord }`
