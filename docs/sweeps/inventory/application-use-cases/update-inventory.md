# updateInventoryUseCase

`updateInventoryUseCase(id: string, input: InventoryForm, client?) → { inventory: InventoryDetailRecord }`

## Use case

### What it does
Primary-section replace for one inventory row. Covers product change, location / warehouse reassignment, stock-count correction, dye-lot edit, `isImported` flip, cost / freight updates, notes.

### Lock scope
- `SELECT id FROM flooring_inventory WHERE id = $1 FOR UPDATE` — the single row being written.

### Transport guard
`assertExpectedUpdatedAt` against inventory snapshot pre-transaction.

### Orchestration
1. Open transaction, lock inventory row.
2. Load snapshot + re-assert `expectedUpdatedAt` inside the lock.
3. Resolve `productId`, optional `locationId` (with its `warehouseId`), optional `warehouseId`.
4. Run domain validators: `validateInventoryInput`, `assertLocationBelongsToWarehouse`, `stockCount >= 0`.
5. **Stock-count reduction guard**: if `input.stockCount < snapshot.stockCount`, aggregate `SELECT COALESCE(SUM("cut"), 0) FROM flooring_cut_log WHERE "inventoryId" = $1` inside the lock. Assert `input.stockCount >= sumCuts`; throw `InventoryExecutionError({ code: "CUT_LOG_EXCEEDS_STARTING_BALANCE", status: 409 })` if the reduction would make `stockAvailable < 0`.
6. `updateInventory(tx, id, input)` → `UPDATE flooring_inventory SET ... WHERE id = $1`.
7. Re-read `getInventoryDetailById(id, tx)` — normalizer recomputes `stockAvailable` / `awaitingCut` / `coverageAvailable` against the new `stockCount`.

### Response
`{ inventory: InventoryDetailRecord }`

## Domain

### `validateInventoryInput(input)`
Structural validation — same contract as on create.

### `assertLocationBelongsToWarehouse(location, warehouseId)`
When both fields are set, location's warehouse must match the row's. The UI clears `locationId` when the user changes warehouse to an incompatible one, but the server re-validates at the boundary.

### `stockCount >= 0`
Sanity on the starting balance.

### Stock-count reduction guard *(composed; in-use-case)*
If the new `stockCount` would drop below the current `SUM(cutLogs.cut)` on this row, reject with `CUT_LOG_EXCEEDS_STARTING_BALANCE`. Same invariant as `computeStockAvailable` but evaluated against the proposed-new balance rather than the current one. Only relevant when the update lowers `stockCount`; no-op when increasing or unchanged.
