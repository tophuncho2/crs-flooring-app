# createInventoryUseCase

`createInventoryUseCase(input: InventoryForm, client?) → { inventory: InventoryDetailRecord }`

## Use case

### What it does
Standalone create of a single inventory row — from the inventory record view's `new` page, or a row-level fallback from the import grid. Creates only the row; cut logs are added separately via `saveInventoryCutLogsUseCase`.

### Lock scope
None beyond envelope receipt. New-row insert.

### Transport guard
Envelope idempotency receipt only.

### Orchestration
1. Open transaction.
2. `SELECT id FROM flooring_product WHERE id = $1` — product existence.
3. If `input.locationId` set: `SELECT id, "warehouseId" FROM flooring_location WHERE id = $1` — location existence + warehouse snapshot for the consistency check.
4. If `input.warehouseId` set: `SELECT id FROM flooring_warehouse WHERE id = $1` — warehouse existence.
5. Run domain validators: `validateInventoryInput`, `assertLocationBelongsToWarehouse`, `stockCount >= 0`.
6. `createInventory(tx, input)` → `INSERT INTO flooring_inventory (...) VALUES (...)`. `isImported` defaults to `false`. `fifoReceivedAt` defaults to `now()` on standalone creates (no import FIFO anchor in this path).
7. Re-read `getInventoryDetailById(newId, tx)` — normalizer computes `stockAvailable = stockCount` (no cut logs yet), `awaitingCut = 0`, `coverageAvailable = stockCount × product.coveragePerUnit`.

### Response
`{ inventory: InventoryDetailRecord }`

## Domain

### `validateInventoryInput(input)`
Structural: required `productId`, non-negative decimals on numeric fields, string shape checks.

### `assertLocationBelongsToWarehouse(location, warehouseId)`
If both `warehouseId` and `locationId` are set, the location's own `warehouseId` must equal the row's. Throws `InventoryExecutionError({ code: "INVENTORY_LOCATION_WAREHOUSE_MISMATCH", status: 400 })` on mismatch.

### `stockCount >= 0`
Sanity: starting balance can't be negative. Throws `INVENTORY_VALIDATION_FAILED` on violation.
