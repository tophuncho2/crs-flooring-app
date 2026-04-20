# updateImportUseCase

`updateImportUseCase(id: string, input: ImportForm, client?) → { importEntry: ImportDetailRecord }`

## Use case

### What it does
Replace-in-place of the import's primary-section fields (`orderNumber`, `tag`, `transportType`, `status`, `warehouseId`, `notes`). `importNumber` is immutable.

### Lock scope
- `SELECT id FROM flooring_import_entry WHERE id = $1 FOR UPDATE` — the single row being written. No child-row locks (children aren't touched).

### Transport guard
`assertExpectedUpdatedAt({ actualUpdatedAt: snapshot.updatedAt, expectedUpdatedAt: mutation.expectedUpdatedAt })` pre-transaction. Plain read; catches "someone else edited this import after you loaded it" before opening the transaction.

### Orchestration
1. Open transaction, lock import row.
2. Load snapshot + re-assert `expectedUpdatedAt` inside the lock (defense in depth against TOCTOU between the pre-transaction read and the lock).
3. Resolve `input.warehouseId` if set via `getWarehouseById(warehouseId, tx)` — typed domain error on miss.
4. Run domain validators: `validateImportInput`, `isImportTransportType`, `isImportStatus`.
5. `updateImport(tx, id, input)` → `UPDATE flooring_import_entry SET ... WHERE id = $1`.
6. Re-read `getImportDetailById(id, tx)`.

### Response
`{ importEntry: ImportDetailRecord }`

## Domain

### `validateImportInput(input)`
Structural validation — same contract as on create.

### `isImportTransportType(input.transportType)`
Enum guard.

### `isImportStatus(input.status)`
Enum guard. Note: setting `status` to `"FINAL"` is not specially blocked here — workflow-immutability of FINAL imports is enforced on the *next* modification (the save-inventory-rows use case refuses writes on FINAL imports; the delete use case blocks FINAL imports). An update that transitions to FINAL is itself allowed.
