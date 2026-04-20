# createImportUseCase

`createImportUseCase(input: ImportForm, client?) → { importEntry: ImportDetailRecord }`

## What it does
Creates a new import-entry row. Metadata only — child inventory rows are added afterward via `saveImportInventoryRowsUseCase`. Idempotent per route receipt.

## Lock scope
None beyond the envelope's idempotency receipt. New-row insert, no pre-existing rows to lock.

## Domain rules orchestrated

### `validateImportInput(input)`
Structural / field-level validation. Required fields, string lengths, FK presence on `warehouseId` (if set).

**Data-layer action**: no query during validation itself. When `warehouseId` is present, the use case pre-resolves via `getWarehouseById(warehouseId, tx)` to fail fast on unknown warehouse with a typed domain error rather than letting Prisma throw a raw FK violation at INSERT time.

### `isImportTransportType(input.transportType)` / `isImportStatus(input.status)`
Enum guards. Closed-set strings enforced at the domain (DB column is free-form `text`, accepts anything).

**Data-layer action**: none — pure predicate checks.

## Transaction flow
1. `withDatabaseTransaction` open.
2. (Optional) `getWarehouseById(warehouseId, tx)` if provided — verify existence.
3. Run domain validators.
4. `createImport(tx, input)` → `INSERT INTO flooring_import_entry (...) VALUES (...)`. `importNumber` auto-assigned by the Postgres sequence.
5. Re-read `getImportDetailById(newId, tx)` — normalized record with counts (child inventory count = 0 at creation).

## Response
`{ importEntry: ImportDetailRecord }`
