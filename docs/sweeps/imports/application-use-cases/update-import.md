# updateImportUseCase

`updateImportUseCase(id: string, input: ImportForm, client?) → { importEntry: ImportDetailRecord }`

## What it does
Replace-in-place of the import's primary-section fields (`orderNumber`, `tag`, `transportType`, `status`, `warehouseId`, `notes`). `importNumber` is immutable and never updated.

## Lock scope
- `SELECT id FROM flooring_import_entry WHERE id = $1 FOR UPDATE` — the single row being written. No child-row locks (children aren't touched).

## Transport guard (pre-transaction)
`assertExpectedUpdatedAt({ actualUpdatedAt: snapshot.updatedAt, expectedUpdatedAt: mutation.expectedUpdatedAt })`. Plain read (not a lock); catches "someone else edited this import after you loaded it" before the transaction opens.

## Domain rules orchestrated

### `validateImportInput(input)`
Structural validation.

**Data-layer action**: `getWarehouseById(input.warehouseId, tx)` if set, so unknown-warehouse surfaces as a typed domain error instead of a Prisma FK error.

### `isImportTransportType` / `isImportStatus` enum guards
Closed-set membership.

**Data-layer action**: none.

## Transaction flow
1. Open transaction, lock import row.
2. Load snapshot + re-assert `expectedUpdatedAt` inside the lock (defense in depth against TOCTOU between the pre-transaction read and the lock).
3. Validate input via domain.
4. `updateImport(tx, id, input)` → `UPDATE flooring_import_entry SET ... WHERE id = $1`.
5. Re-read `getImportDetailById(id, tx)` — counts refreshed by normalizer.

## Response
`{ importEntry: ImportDetailRecord }`
