# createInventoryUseCase

`createInventoryUseCase(input: InventoryForm, client?) → { inventory: InventoryDetailRecord }`

## What it does
Standalone create of a single inventory row — from the inventory record view's `new` page, or a row-level fallback from the import grid. Creates only the row; cut logs are added separately via `saveInventoryCutLogsUseCase`.

## Lock scope
None beyond envelope receipt. New-row insert, no pre-existing rows to lock.

## Domain rules orchestrated

### `stockCount >= 0`
Sanity on the starting balance.

**Data-layer action**: none.

### `assertLocationBelongsToWarehouse(location, input.warehouseId)`
If `warehouseId` and `locationId` are both set, they must be consistent (location's warehouse matches the row's chosen warehouse).

**Data-layer action**: `SELECT id, "warehouseId" FROM flooring_location WHERE id = $1`. Mismatch → throws `INVENTORY_LOCATION_WAREHOUSE_MISMATCH`.

### `validateInventoryInput(input)`
Structural: required product, non-negative numeric fields, string shape.

**Data-layer action**: `SELECT id FROM flooring_product WHERE id = $1` — product existence check.

## Transaction flow
1. Open transaction.
2. Resolve product + (if set) location + warehouse existence.
3. Run domain validators.
4. `createInventory(tx, input)` → `INSERT INTO flooring_inventory (...) VALUES (...)`. `isImported` defaults to `false`. `fifoReceivedAt` defaults to `now()` for standalone creates (no import FIFO anchor).
5. Re-read `getInventoryDetailById(newId, tx)` — normalizer computes `stockAvailable = stockCount` (no cut logs yet), `awaitingCut = 0`, `coverageAvailable = stockCount × product.coveragePerUnit`.

## Response
`{ inventory: InventoryDetailRecord }`
