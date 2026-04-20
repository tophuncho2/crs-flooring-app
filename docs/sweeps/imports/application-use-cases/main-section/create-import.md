# createImportUseCase

`createImportUseCase(input: ImportForm, client?) → { importEntry: ImportDetailRecord }`

## Use case

### What it does
Creates a new import-entry row. Metadata only — child inventory rows are added afterward via `saveImportInventoryRowsUseCase`. Idempotent per route receipt.

### Lock scope
None beyond the envelope's idempotency receipt. New-row insert, no pre-existing rows to lock.

### Transport guard
Envelope idempotency receipt only — no `expectedUpdatedAt` on a create.

### Orchestration
1. `withDatabaseTransaction` open.
2. If `input.warehouseId` is set: resolve via `getWarehouseById(warehouseId, tx)` — turns unknown-warehouse into a typed domain error instead of a raw Prisma FK violation.
3. Run domain validators: `validateImportInput`, `isImportTransportType`, `isImportStatus`.
4. `createImport(tx, input)` → `INSERT INTO flooring_import_entry (...) VALUES (...)`. `importNumber` auto-assigned by the `flooring_import_number_seq` sequence.
5. Re-read `getImportDetailById(newId, tx)` — normalized record with child-inventory counts (all zero at creation).

### Response
`{ importEntry: ImportDetailRecord }`

## Domain

### `validateImportInput(input)`
Structural / field-level validation. Required fields present, string lengths within bounds, `warehouseId` (if set) a syntactically valid uuid.

### `isImportTransportType(input.transportType)`
Enum guard — `input.transportType` must be a member of `IMPORT_TRANSPORT_TYPE_VALUES`.

### `isImportStatus(input.status)`
Enum guard — `input.status` must be a member of `IMPORT_STATUS_VALUES` (`"PENDING"` / `"FINAL"`).
