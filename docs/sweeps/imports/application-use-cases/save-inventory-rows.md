# saveImportInventoryRowsUseCase

`saveImportInventoryRowsUseCase(id: string, diff: InventoryRowsDiff, client?) → { importEntry: ImportDetailRecord, tempIdMap: Record<string,string> }`

## Use case

### What it does
Atomic section save for the **inventory-rows child section** of an import. Applies adds + modifies + deletes in one transaction; returns a `tempIdMap` so the client reconciles optimistic temp ids → real uuids without refetching.

### Lock scope
- `SELECT id FROM flooring_import_entry WHERE id = $1 FOR UPDATE` — the parent import row. **Confirmed: the import row is locked for every save against this section.**
- `SELECT id FROM flooring_inventory WHERE id = ANY($1) ORDER BY id FOR UPDATE` — the touched inventory rows (modifies + deletes). Skip if empty.

Acquisition order: import row first, then inventory rows by id ascending. Added rows don't exist yet — their insertion is protected by the import-row lock and DB `@@unique([locationId, itemNumber])` constraint.

### Transport guard
- Envelope: `assertExpectedUpdatedAt` against import snapshot.
- Per-row: `expectedUpdatedAt` on each `modified` / `deleted` entry in the diff.

### Orchestration
1. Open transaction.
2. Lock import row.
3. Lock touched inventory rows ordered by id (skip if none).
4. Load snapshot, list existing rows via `listInventoryByImport(id, tx)`, resolve locations via `SELECT id, "warehouseId" FROM flooring_location WHERE id = ANY($1)`, resolve products via `SELECT id FROM flooring_product WHERE id = ANY($1)`.
5. **Status gate**: refuse if `importEntry.status === "FINAL"` — throw `ImportExecutionError({ code: "IMPORT_IN_USE", status: 409 })` with message indicating FINAL imports are immutable.
6. `validateInventoryRowsDiff(diff, existing, importEntry.warehouseId)` — delegates to the inventory domain's validator for duplicate-itemNumber, location-warehouse match, FK existence, stranded modifications, per-row `expectedUpdatedAt`.
7. Assign tempIds → fresh uuids for added rows; accumulate into `tempIdMap`.
8. Set `fifoReceivedAt = importEntry.createdAt` on every added row (FIFO-anchor rule).
9. Set `warehouseId = resolvedLocation.warehouseId` on every added row (warehouse source-of-truth rule — the UI does not expose a per-row warehouse selector on the import view).
10. `applyImportInventoryRowsDiff(tx, prepared)` — batch: `DELETE WHERE id = ANY($deleted)`, batched `INSERT` for added, per-row `UPDATE` for modified.
11. Re-read `getImportDetailById(id, tx)` — normalizer recomputes child-row counts.

### Response
`{ importEntry: ImportDetailRecord, tempIdMap }`

## Domain

### Status gate — `importEntry.status !== "FINAL"`
Imports in FINAL state are immutable; rows cannot be added / modified / deleted. Implemented inline in the use case (simple comparison); no separate domain function.

### `validateInventoryRowsDiff(diff, existing, warehouseId)` *(inventory domain)*
Checks applied:
- Duplicate `(locationId, itemNumber)` pairs in the post-diff set.
- Location-warehouse match (location's `warehouseId` equals the passed `warehouseId`).
- Location existence, product existence.
- Stranded modifies / deletes (ids must be in `existing`).
- Per-row `expectedUpdatedAt` match.
- Structural shape.

Throws `InventoryExecutionError({ code: "INVENTORY_VALIDATION_FAILED", status: 400, issues })` with the issue list on any failure.

### FIFO-anchor rule *(imports domain)*
Every added row's `fifoReceivedAt` is set to `importEntry.createdAt`. Never `now()`, even for rows added long after the import was created. The import is the FIFO anchor.

### Warehouse source-of-truth rule *(imports domain)*
Every added row's `warehouseId` is set to the resolved location's `warehouseId`, not to a client-submitted value. The UI doesn't surface a per-row warehouse selector on this path; warehouse is inherited from the chosen location.
