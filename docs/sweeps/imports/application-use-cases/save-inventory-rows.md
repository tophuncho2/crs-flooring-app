# saveImportInventoryRowsUseCase

`saveImportInventoryRowsUseCase(id: string, diff: ImportInventoryRowsDiff, client?) → { importEntry: ImportDetailRecord, tempIdMap: Record<string,string> }`

## What it does
Atomic section save for the **inventory-rows** child section of an import. Applies adds + modifies + deletes in one transaction; returns a `tempIdMap` so the client reconciles optimistic temp ids → real uuids without refetching.

## Lock scope
- `SELECT id FROM flooring_import_entry WHERE id = $1 FOR UPDATE` — the parent.
- `SELECT id FROM flooring_inventory WHERE id = ANY($1) ORDER BY id FOR UPDATE` — the touched inventory rows (modified + deleted). Skip if empty.

Acquisition order: import row first, then inventory rows by id ascending. Added rows don't exist yet — their insertion is protected by the import-row lock and DB unique constraints.

## Transport guard (pre-transaction)
- Envelope: `assertExpectedUpdatedAt` against import snapshot.
- Per-row: `expectedUpdatedAt` on each `modified` / `deleted` entry in the diff.

## Domain rules orchestrated

### Status gate — refuse if `status === "FINAL"`
Imports in FINAL state are immutable; rows cannot be added / modified / deleted.

**Data-layer action**: `getImportById(id, tx)` already in memory from the lock-then-load step; no extra query.

### `validateInventoryRowsDiff(diff, existing, importEntry.warehouseId)` *(from inventory domain)*
Checks: duplicate `(locationId, itemNumber)` pair in adds; location's `warehouseId` matches the import's; referenced products + locations exist; stranded modifications/deletes (ids not in `existing`) rejected.

**Data-layer action**:
- `existing`: `listInventoryByImport(id, tx)` — single SELECT.
- Product existence: `SELECT id FROM flooring_product WHERE id = ANY($1)` over the diff's referenced product ids.
- Location shape: `SELECT id, "warehouseId" FROM flooring_location WHERE id = ANY($1)` — resolves both existence AND the warehouse-match invariant in one query.

### FIFO rule
`fifoReceivedAt = importEntry.createdAt` for every added row.

**Data-layer action**: value copied into INSERT payload; snapshot already loaded.

### Warehouse source-of-truth rule
Each added row: `warehouseId = resolvedLocation.warehouseId` (the UI does not expose a per-row warehouse selector on the import view; warehouse inherits from the chosen location's warehouse, which must match the import's).

**Data-layer action**: value written into INSERT payload; location lookup already done in validation.

### TempId → uuid assignment
Every `added[].tempId` gets a fresh `crypto.randomUUID()`; mapping accumulated in `tempIdMap`.

**Data-layer action**: none.

## Transaction flow
1. Open transaction.
2. Lock import row.
3. Lock touched inventory rows ordered by id.
4. Load snapshot, list existing rows, resolve locations + products.
5. Status gate (reject if FINAL) + `validateInventoryRowsDiff`.
6. Assign tempIds → uuids; set `fifoReceivedAt` + `warehouseId` on added rows.
7. `applyImportInventoryRowsDiff(tx, prepared)` — batch:
   - `DELETE FROM flooring_inventory WHERE id = ANY($deletedIds)`
   - Batched `INSERT` for added rows
   - Per-row `UPDATE` for modified rows
8. Re-read `getImportDetailById(id, tx)` — normalizer computes fresh counts.

## Response
`{ importEntry: ImportDetailRecord, tempIdMap }`
