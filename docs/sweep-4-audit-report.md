# Audit Report — Application + Worker + Relay

Read-only audit produced for sweep 4. Captures the current state of the
application layer (`imports/`, `inventory/`), the worker process, the
relay process, and the outbox infrastructure they share. Cut-log
application code is invisible per the sweep prompt.

## 1. Application layer per-file inventory

### 1.1 `packages/application/src/flooring/imports/`

Directory contains 7 files. Total: 524 lines.

| File | Lines | Purpose | Named exports | External imports | Cross-module |
|---|---|---|---|---|---|
| `create-import.ts` | 57 | Create-import use case. Validates `ImportPrimaryForm`, looks up warehouse, calls `createImport(...)` data primitive. | `createImportUseCase` | `@builders/db`: `Prisma`, `createImport`, `getWarehouseById`, `withDatabaseTransaction`. `@builders/domain`: `validateImportPrimaryForm`. | `./errors.js`, `./types.js` |
| `update-import.ts` | 100 | Update-import use case. Loads current import, merges with patch, validates, optionally re-resolves warehouse, calls `updateImport(id, …)`. | `updateImportUseCase` | `@builders/db`: `Prisma`, `getImportById`, `getWarehouseById`, `updateImport`, `withDatabaseTransaction`, `UpdateImportInput as DbUpdateImportInput`. `@builders/domain`: `isImportStatus`, `isImportTransportType`, `validateImportPrimaryForm`, `type ImportPrimaryForm`. | `./errors.js`, `./types.js` |
| `delete-import.ts` | 41 | Delete-import use case. Calls `getImportDeleteState`, gates on `isImportDeleteBlocked`, calls `deleteImportById`. | `deleteImportUseCase` | `@builders/db`: `Prisma`, `deleteImportById`, `getImportDeleteState`, `withDatabaseTransaction`. `@builders/domain`: `buildImportDeleteBlockedMessage`, `isImportDeleteBlocked`. | `./errors.js` |
| `save-inventory-rows.ts` | 274 | Diff-applier use case for the import's inventory rows. Locks parent import `FOR UPDATE`, validates diff, asserts row versions via `expectedUpdatedAt`, assigns tempId→uuid, calls `applyImportInventoryRowsDiff`, returns the canonical `ImportDetailRecord`. | `saveImportInventoryRowsUseCase` | `@builders/db`: `Prisma`, `applyImportInventoryRowsDiff`, `getImportById`, `getImportDetailById`, `withDatabaseTransaction`, `type ImportsDbClient`. `@builders/domain`: `assignInventoryDiffIds`, `describeInventoryDiffIssues`, `validateInventoryRowsDiff`, `type DiffExistingInventoryRow`, `type DiffLocationLookup`, `type InventoryRowsDiff`. | `./errors.js`, `../inventory/errors.js` |
| `errors.ts` | 27 | Module-scoped execution error class + code union. | `ImportErrorCode` (type), `ImportExecutionError` (class) | none | none |
| `types.ts` | 19 | Use-case input/output shapes. | `CreateImportInput`, `UpdateImportInput`, `ImportResult`, `SaveImportInventoryRowsResult` | `@builders/db`: `type ImportDetailRecord`, `type ImportRecord`. | none |
| `index.ts` | 6 | Barrel. | `export *` from all five module files. | none | self |

### 1.2 `packages/application/src/flooring/imports/staged-inventory-rows/`

**Directory does not exist.** `ls packages/application/src/flooring/imports/staged-inventory-rows` → `No such file or directory`. There is no application-layer module for staged inventory rows. The data layer ships `markStagedRowsForImport` and `applyStagedInventoryRowsDiff`; the domain layer ships the form rules, payload schema, and editability predicates; nothing in the application layer consumes them yet.

### 1.3 `packages/application/src/flooring/inventory/`

Directory contains 6 files. Total: 374 lines. (`cut-logs/` subdirectory does not exist; out of scope per prompt.)

| File | Lines | Purpose | Named exports | External imports | Cross-module |
|---|---|---|---|---|---|
| `create-inventory.ts` | 108 | Create-inventory use case. Validates input, resolves product / warehouse / location, calls `createInventory(...)` with `isImported: false`. | `createInventoryUseCase` | `@builders/db`: `Prisma`, `createInventory`, `getLocationById`, `getProductById`, `getWarehouseById`, `withDatabaseTransaction`. `@builders/domain`: `describeInventoryValidationIssues`, `validateInventoryInput`. | `./errors.js`, `./types.js` |
| `update-inventory.ts` | 164 | Update-inventory use case. Loads current row, blocks edits while `!current.isImported`, blocks `isImportedReversal`, validates merged form, optionally re-resolves product/warehouse/location, calls `updateInventory(id, …)`. | `updateInventoryUseCase` | `@builders/db`: `Prisma`, `getInventoryById`, `getLocationById`, `getProductById`, `getWarehouseById`, `updateInventory`, `withDatabaseTransaction`, `UpdateInventoryInput as DbUpdateInventoryInput`. `@builders/domain`: `describeInventoryValidationIssues`, `isImportedReversal`, `validateInventoryInput`. | `./errors.js`, `./types.js` |
| `delete-inventory.ts` | 41 | Delete-inventory use case. Calls `getInventoryDeleteState`, gates on `isInventoryDeleteBlocked`, calls `deleteInventoryById`. | `deleteInventoryUseCase` | `@builders/db`: `Prisma`, `deleteInventoryById`, `getInventoryDeleteState`, `withDatabaseTransaction`. `@builders/domain`: `buildInventoryDeleteBlockedMessage`, `isInventoryDeleteBlocked`. | `./errors.js` |
| `errors.ts` | 37 | Module-scoped execution error class + code union. | `InventoryErrorCode` (type), `InventoryExecutionError` (class) | none | none |
| `types.ts` | 19 | Use-case input/output shapes. | `CreateInventoryInput`, `UpdateInventoryInput`, `InventoryResult` | `@builders/db`: `type InventoryRecord`. | none |
| `index.ts` | 5 | Barrel. | `export *` from the five module files. | none | self |

### 1.4 Cross-cutting application infrastructure

| File | Lines | Purpose | Named exports |
|---|---|---|---|
| `packages/application/src/index.ts` | 15 | Top-level barrel. | `export *` from `account/`, `admin/`, `flooring/contacts/`, `flooring/imports/`, `flooring/inventory/`, `flooring/manufacturers/`, `flooring/products/`, `flooring/services/`, `flooring/warehouses/`, `management/management-companies/`, `management/properties/`, `management/job-types/`, `management/templates/`. Direct named exports: `isP2002`, `slugify`, `generateUniqueSlug`. |
| `packages/application/src/shared/prisma-errors.ts` | 10 | `isP2002(error, targetColumn?)` helper for Prisma unique-constraint detection. | `isP2002` |
| `packages/application/src/shared/slug.ts` | 29 | Pure `slugify(input)` + `generateUniqueSlug(name, slugExists)`. | `slugify`, `generateUniqueSlug` |

There is no shared transaction wrapper or telemetry helper in `packages/application/src/`. There is no shared base `ExecutionError` class — each module declares its own. `packages/application/src/shared/` holds two small utilities and nothing else.

## 2. Use case conventions

### 2.1 Signature shape

The canonical signature uses a positional input followed by an optional `client` parameter. The `client` is **always optional**, defaulting to a fresh transaction opened by `withDatabaseTransaction`. The use case returns the data-layer record directly (no wrapping result envelope, no discriminated union — exceptions are thrown).

Two representative signatures, verbatim:

```typescript
// packages/application/src/flooring/imports/create-import.ts:16
export async function createImportUseCase(
  input: CreateImportInput,
  client?: Prisma.TransactionClient,
): Promise<ImportResult> {
```

```typescript
// packages/application/src/flooring/inventory/update-inventory.ts:24
export async function updateInventoryUseCase(
  id: string,
  input: UpdateInventoryInput,
  client?: Prisma.TransactionClient,
): Promise<InventoryResult> {
```

Use cases throw `*ExecutionError` instances. They never return error shapes.

### 2.2 Transaction wrapping pattern

Every use case in the in-scope modules wraps its body in `withDatabaseTransaction` from `@builders/db` and uses the `client ?? tx` idiom to thread the caller's client through when present. 7 of 7 use cases in `imports/` and `inventory/` follow the pattern. (96 total `withDatabaseTransaction` references across `packages/application/src/`; 14 of those references are in the in-scope modules.)

The pattern is identical across files. One full body, verbatim:

```typescript
// packages/application/src/flooring/imports/delete-import.ts
import {
  Prisma,
  deleteImportById,
  getImportDeleteState,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildImportDeleteBlockedMessage,
  isImportDeleteBlocked,
} from "@builders/domain"
import { ImportExecutionError } from "./errors.js"

export async function deleteImportUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const state = await getImportDeleteState(id, c)
    if (!state) {
      throw new ImportExecutionError({
        code: "IMPORT_NOT_FOUND",
        message: "Import not found.",
        status: 404,
      })
    }

    if (isImportDeleteBlocked(state)) {
      throw new ImportExecutionError({
        code: "IMPORT_DELETE_BLOCKED_BY_INVENTORY",
        message: buildImportDeleteBlockedMessage(state),
        status: 409,
      })
    }

    await deleteImportById(id, c)

    return { ok: true }
  })
}
```

There is no per-module wrapper or composition helper. Use cases call `withDatabaseTransaction` directly. The `client ?? tx` line shadows the outer parameter so subsequent data-layer calls always receive a non-undefined client. Note that this means if a caller passes `client`, the body still opens a *new* transaction internally and runs all reads/writes against the caller's client — the wrapper transaction becomes a no-op insulator. This is the established pattern.

### 2.3 Domain error → execution error translation

#### Catalog of `*ExecutionError` classes (13 total, one per module)

| File | Class | Code-union name |
|---|---|---|
| `account/errors.ts` | `TablePreferenceExecutionError` | `code: string` (no union) |
| `admin/errors.ts` | `GovernanceExecutionError` | `GovernanceErrorCode` |
| `flooring/contacts/errors.ts` | `ContactExecutionError` | `ContactErrorCode` |
| `flooring/imports/errors.ts` | `ImportExecutionError` | `ImportErrorCode` |
| `flooring/inventory/errors.ts` | `InventoryExecutionError` | `InventoryErrorCode` |
| `flooring/manufacturers/errors.ts` | `ManufacturerExecutionError` | `ManufacturerErrorCode` |
| `flooring/products/errors.ts` | `ProductExecutionError` (re-exported from `@builders/domain`) | `ProductErrorCode` |
| `flooring/services/errors.ts` | `ServiceExecutionError` | `ServiceErrorCode` |
| `flooring/warehouses/errors.ts` | `WarehouseExecutionError` | `WarehouseErrorCode` |
| `management/job-types/errors.ts` | `JobTypeExecutionError` | `JobTypeErrorCode` |
| `management/management-companies/errors.ts` | `ManagementCompanyExecutionError` | `ManagementCompanyErrorCode` |
| `management/properties/errors.ts` | `PropertyExecutionError` | `PropertyErrorCode` |
| `management/templates/errors.ts` | `TemplateExecutionError` | `TemplateErrorCode` |
| `management/templates/material-items/errors.ts` | `TemplateMaterialItemExecutionError` | `TemplateMaterialItemErrorCode` |

Full definition of `ImportExecutionError`, verbatim from `packages/application/src/flooring/imports/errors.ts`:

```typescript
export type ImportErrorCode =
  | "IMPORT_VALIDATION_FAILED"
  | "IMPORT_NOT_FOUND"
  | "IMPORT_WAREHOUSE_NOT_FOUND"
  | "IMPORT_DELETE_BLOCKED_BY_INVENTORY"

export class ImportExecutionError extends Error {
  readonly code: ImportErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: ImportErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "ImportExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
```

Every other `*ExecutionError` follows the identical shape: `code`, `status`, optional `field`, optional `payload: Record<string, unknown>`.

#### Error code unions (in scope)

`ImportErrorCode`:
- `IMPORT_VALIDATION_FAILED`
- `IMPORT_NOT_FOUND`
- `IMPORT_WAREHOUSE_NOT_FOUND`
- `IMPORT_DELETE_BLOCKED_BY_INVENTORY`

`InventoryErrorCode`:
- `INVENTORY_NOT_FOUND`
- `INVENTORY_IN_USE`
- `INVENTORY_VALIDATION_FAILED`
- `INVENTORY_DIFF_VALIDATION_FAILED`
- `INVENTORY_LOCATION_WAREHOUSE_MISMATCH`
- `INVENTORY_WAREHOUSE_NOT_FOUND`
- `INVENTORY_LOCATION_NOT_FOUND`
- `INVENTORY_PRODUCT_NOT_FOUND`
- `INVENTORY_STALE_ROW_VERSION`
- `IMPORTED_REVERSAL_NOT_ALLOWED` (does not match the `INVENTORY_*` prefix)
- `INVENTORY_PENDING_IMPORT`
- `CUT_LOG_INVENTORY_NOT_IMPORTED` (annotated `// Sweep-3 reserved:` in source)
- `CUT_LOG_EXCEEDS_STARTING_BALANCE` (annotated `// Sweep-3 reserved:` in source)

#### Catch-and-translate sites

Searched every use case in scope. **Zero in-scope modules currently translate Prisma errors.** No `try { … } catch (error) { isP2002(...) }` or `error instanceof Prisma.PrismaClientKnownRequestError` blocks exist in `packages/application/src/flooring/imports/` or `packages/application/src/flooring/inventory/`. `isP2002` and `Prisma.PrismaClientKnownRequestError` translations only happen in `management/`, `flooring/products/`, `flooring/manufacturers/`, etc.

Two representative translation patterns from elsewhere in the application layer:

**Unique-constraint translation** (`management-companies/create-management-company.ts:29-42`):

```typescript
try {
  return await createManagementCompanyRecord(input, c)
} catch (error) {
  if (isP2002(error, "name")) {
    throw new ManagementCompanyExecutionError({
      code: "MANAGEMENT_COMPANY_NAME_CONFLICT",
      message: MANAGEMENT_COMPANY_NAME_CONFLICT_MESSAGE,
      status: 409,
      field: "name",
    })
  }
  throw error
}
```

**Record-not-found translation** (`management-companies/update-management-company.ts:33-47`):

```typescript
} catch (error) {
  if (isP2002(error, "name")) {
    throw new ManagementCompanyExecutionError({
      code: "MANAGEMENT_COMPANY_NAME_CONFLICT",
      message: MANAGEMENT_COMPANY_NAME_CONFLICT_MESSAGE,
      status: 409,
      field: "name",
    })
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    throw new ManagementCompanyExecutionError({
      code: "MANAGEMENT_COMPANY_NOT_FOUND",
      message: "Management company not found.",
      status: 404,
    })
  }
  throw error
}
```

Domain-error translation (catching a `*DomainError` thrown from an `assert*` helper and re-wrapping as a `*ExecutionError`) is not present anywhere in the application layer. Use cases instead pre-flight every domain check via `is*` predicates rather than letting `assert*` throw, so domain errors don't reach the use-case body.

### 2.4 Validation pattern

In-scope use cases call domain validators that return an `Issue[]` array, then throw on the **first** issue (the array is preserved in the error's `payload.issues` for downstream display). They do not aggregate or render issue lists themselves — `describeInventoryDiffIssues` (when present) does the rendering at the data layer / domain layer.

Representative block (`create-import.ts:23-33`):

```typescript
const issues = validateImportPrimaryForm(input)
if (issues.length > 0) {
  const [first] = issues
  throw new ImportExecutionError({
    code: "IMPORT_VALIDATION_FAILED",
    message: first.message,
    status: 400,
    field: first.field,
    payload: { issues },
  })
}
```

The diff-applier (`save-inventory-rows.ts`) uses a slightly different pattern: it passes the full `Issue[]` to a description helper for the `message` instead of using the first issue's message:

```typescript
// save-inventory-rows.ts:232
if (issues.length > 0) {
  throw new InventoryExecutionError({
    code: "INVENTORY_DIFF_VALIDATION_FAILED",
    message: describeInventoryDiffIssues(issues),
    status: 400,
    payload: { issues },
  })
}
```

### 2.5 Outbox event writes

**Zero application use cases currently write to the outbox.** Searched `packages/application/src/` for `createQueueOutboxEvent`, `outboxRepository`, `enqueueOutbox`, `enqueue`, `topic:`, and any import from `packages/db/src/queues/`. Zero matches. No application-layer precedent exists for writing to `queueOutboxEvent`.

The producer-side function `createQueueOutboxEvent` is exported from `@builders/db` (via `packages/db/src/index.ts:24`) but has zero callers anywhere in the repo (see §7.3).

### 2.6 Telemetry wrapping

`withMutationTelemetry` is a route-level helper at `apps/web/modules/shared/engines/common/application/mutation-telemetry.ts`. It is imported only from `apps/web/app/api/...` route handlers (sample: `apps/web/app/api/warehouses/route.ts:4`, `apps/web/app/api/warehouses/[id]/route.ts:4`, `apps/web/app/api/products/route.ts:4`).

`packages/application/src/` has zero references to `withMutationTelemetry`. The application package also has zero imports from `@/modules/...` and zero imports from `@builders/lib` (`structured-logging`, etc.). The use cases themselves are telemetry-agnostic; route handlers wrap the call.

This division is consistent with the package CLAUDE.md rule (`packages/application/CLAUDE.md` rule 1: "May import from `@builders/domain` and `@builders/db`. Nothing else.").

## 3. Per-module disposition

### 3.1 Imports

| File | State | Reason |
|---|---|---|
| `create-import.ts` | Broken | Imports `createImport` (data primitive renamed to `createImportRecord`); passes `transportType` and `status` to `createImport`, neither of which exists on the new `ImportPrimaryForm` (manufacturerId is now required there). |
| `update-import.ts` | Broken | Imports `updateImport` (renamed) and `UpdateImportInput as DbUpdateImportInput` (renamed to `UpdateImportRecordInput`). Imports `isImportStatus` and `isImportTransportType` from `@builders/domain` — neither exists. References `ImportPrimaryForm.transportType` / `.status` and `ImportRow.transportType` / `.status` — none of those fields exist. |
| `delete-import.ts` | Broken | Imports `deleteImportById` (renamed to `deleteImportRecordById`) and `getImportDeleteState` (renamed to `getImportLinkState` per sweep 2). |
| `save-inventory-rows.ts` | Broken | Imports `applyImportInventoryRowsDiff` (does not exist; data layer ships only `applyStagedInventoryRowsDiff`). Selects `isImported` from `flooring_inventory` (column was removed by sweep 1 schema migration). Reads `current.isImported` and uses `_count.cutLogs` against an old shape. References `update.patch.productId` (no longer present on `InventoryRowUpdatePatch`). Sub-types `string` for `itemNumber` and `warehouseId` while the underlying records carry `string \| null`. |
| `errors.ts` | Working | No external references; pure types. |
| `types.ts` | Working | Imports are valid; `ImportDetailRecord` and `ImportRecord` exist on `@builders/db`. The fields `transportType` / `status` declared in `CreateImportInput` are unused by the data layer (they're still accepted by callers, but the import write primitive no longer carries them). |
| `index.ts` | Working | Pure barrel. |

### 3.2 Staged inventory rows

`packages/application/src/flooring/imports/staged-inventory-rows/` does not exist. There is no application-layer code for staged inventory rows. Domain (sweep 1) and data (sweep 2) ship the surfaces; the application layer has not yet picked them up.

### 3.3 Inventory

| File | State | Reason |
|---|---|---|
| `create-inventory.ts` | Broken | Imports `createInventory` (renamed to `createInventoryRecord` per audit's *Record convention). Imports `describeInventoryValidationIssues` and `validateInventoryInput` from `@builders/domain` — neither exists (compiler suggests `describeInventoryFormValidationIssues`). Passes `stockCount` (renamed to `startingStock` in the new write input shape), `isImported: false` (column removed). |
| `update-inventory.ts` | Broken | Imports `updateInventory` (renamed), `UpdateInventoryInput as DbUpdateInventoryInput` (renamed to `UpdateInventoryRecordInput`). Imports `describeInventoryValidationIssues`, `isImportedReversal`, `validateInventoryInput` from `@builders/domain` — none exist. References `current.isImported` and `current.stockCount` — neither exists on `InventoryRow` post sweep 1. |
| `delete-inventory.ts` | Broken | Imports `deleteInventoryById` (renamed to `deleteInventoryRecordById`). |
| `errors.ts` | Working | Includes two `// Sweep-3 reserved:` codes. The `IMPORTED_REVERSAL_NOT_ALLOWED` code does not match the `INVENTORY_*` prefix convention used by the rest of the union. |
| `types.ts` | Working | Imports `InventoryRecord` from `@builders/db` (exists). `UpdateInventoryInput` includes an `isImported?: boolean` field that no longer maps to anything in the data-layer record shape (column removed by sweep 1). |
| `index.ts` | Working | Pure barrel. |

## 4. Stale type/symbol inventory

### 4.1 Stale data-layer imports

Every `from "@builders/db"` import that does not resolve, with file path and line:

| Symbol | File | Line | New name (if known) |
|---|---|---|---|
| `createImport` | `packages/application/src/flooring/imports/create-import.ts` | 3 | `createImportRecord` |
| `updateImport` | `packages/application/src/flooring/imports/update-import.ts` | 5 | `updateImportRecord` |
| `UpdateImportInput as DbUpdateImportInput` | `packages/application/src/flooring/imports/update-import.ts` | 7 | `UpdateImportRecordInput` |
| `deleteImportById` | `packages/application/src/flooring/imports/delete-import.ts` | 3 | `deleteImportRecordById` |
| `getImportDeleteState` | `packages/application/src/flooring/imports/delete-import.ts` | 4 | `getImportLinkState` (sweep 2) |
| `applyImportInventoryRowsDiff` | `packages/application/src/flooring/imports/save-inventory-rows.ts` | 3 | does not exist (only `applyStagedInventoryRowsDiff`) |
| `createInventory` | `packages/application/src/flooring/inventory/create-inventory.ts` | 3 | `createInventoryRecord` |
| `updateInventory` | `packages/application/src/flooring/inventory/update-inventory.ts` | 7 | `updateInventoryRecord` |
| `UpdateInventoryInput as DbUpdateInventoryInput` | `packages/application/src/flooring/inventory/update-inventory.ts` | 9 | `UpdateInventoryRecordInput` |
| `deleteInventoryById` | `packages/application/src/flooring/inventory/delete-inventory.ts` | 3 | `deleteInventoryRecordById` |

### 4.2 Stale domain imports

| Symbol | File | Line |
|---|---|---|
| `isImportStatus` | `packages/application/src/flooring/imports/update-import.ts` | 10 |
| `isImportTransportType` | `packages/application/src/flooring/imports/update-import.ts` | 11 |
| `describeInventoryValidationIssues` | `packages/application/src/flooring/inventory/create-inventory.ts` | 10 |
| `validateInventoryInput` | `packages/application/src/flooring/inventory/create-inventory.ts` | 11 |
| `describeInventoryValidationIssues` | `packages/application/src/flooring/inventory/update-inventory.ts` | 12 |
| `isImportedReversal` | `packages/application/src/flooring/inventory/update-inventory.ts` | 13 |
| `validateInventoryInput` | `packages/application/src/flooring/inventory/update-inventory.ts` | 14 |

(`save-inventory-rows.ts` does not import any stale domain symbols — its domain imports all resolve, but downstream type mismatches show up in the error inventory.)

### 4.3 Stale field references

| Reference | File | Line | Underlying field state |
|---|---|---|---|
| `input.transportType` | `packages/application/src/flooring/imports/update-import.ts` | 27 | `ImportPrimaryForm.transportType` does not exist |
| `current.transportType` | `packages/application/src/flooring/imports/update-import.ts` | 54 | `ImportRow.transportType` does not exist |
| `input.status` (on `ImportPrimaryForm`) | `packages/application/src/flooring/imports/update-import.ts` | 28 | `ImportPrimaryForm.status` does not exist |
| `current.status` (on `ImportRow`) | `packages/application/src/flooring/imports/update-import.ts` | 55 | `ImportRow.status` does not exist |
| `current.isImported` | `packages/application/src/flooring/inventory/update-inventory.ts` | 41 | `InventoryRow.isImported` does not exist (sweep 1 removal) |
| `current.stockCount` | `packages/application/src/flooring/inventory/update-inventory.ts` | 64 | `InventoryRow.stockCount` does not exist (renamed to `startingStock`) |
| `select: { ..., isImported: true }` | `packages/application/src/flooring/imports/save-inventory-rows.ts` | 44 | `flooring_inventory.isImported` column removed |
| `row.isImported` (after select) | `packages/application/src/flooring/imports/save-inventory-rows.ts` | 55 | same — column removed |
| `_count.cutLogs` access | `packages/application/src/flooring/imports/save-inventory-rows.ts` | 57 | works at runtime against current schema, but the typed `findMany` shape rejects the `_count` selector since `select` doesn't include `_count` after the `isImported` removal cascade |
| `update.patch.productId` (read + write) | `packages/application/src/flooring/imports/save-inventory-rows.ts` | 85 | `InventoryRowUpdatePatch.productId` was removed from the patch shape (the worker materializer is now responsible for productId) |
| `input.isImported` (on `UpdateInventoryInput`) | `packages/application/src/flooring/inventory/update-inventory.ts` | 41, 49, 149 | column removed; field is still declared on the local `UpdateInventoryInput` in `inventory/types.ts` but maps to nothing in the data-layer write input |
| `input.isImported` set in `dbInput` | `packages/application/src/flooring/inventory/update-inventory.ts` | 149 | same |
| `manufacturerId` missing from `CreateImportInput` | `packages/application/src/flooring/imports/create-import.ts` | 23 | `ImportPrimaryForm` now requires `manufacturerId`; the local `CreateImportInput` does not declare it |

## 5. Worker layer (`apps/worker/src/`)

### 5.1 Directory structure

```
apps/worker/
├── README.md
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── dist/                       (build output)
├── node_modules/               (installed)
├── tests/                      (not enumerated)
└── src/
    ├── bootstrap.ts
    ├── env.ts
    ├── application/
    │   └── process-work-order-auto-allocation.ts
    ├── processors/
    │   └── process-work-order-auto-allocation.ts
    └── queues/
        └── connection.ts
```

5 `.ts` source files under `src/`. Total: 216 lines.

### 5.2 Per-file inventory

| File | Lines | Purpose | Named exports | External imports |
|---|---|---|---|---|
| `bootstrap.ts` | 139 | Worker process entry. Reads env, opens Redis connection, builds the auto-allocation BullMQ Worker with QueueEvents, wires structured logging on `active` / `completed` / `failed`, awaits `waitUntilReady`, handles `SIGINT` / `SIGTERM` shutdown. | `main` (called immediately as `main()`) | `@builders/db`: `getDatabaseEnvironment`. `@builders/domain`: `WORK_ORDER_AUTO_ALLOCATION_QUEUE`, `parseAutoAllocateWorkOrderJob`, `isWorkflowProcessingError`, `type AutoAllocateWorkOrderJobV1`. `@builders/lib`: `logStructuredEvent`. `bullmq`: `QueueEvents`, `UnrecoverableError`, `Worker`. Local: `./env.js`, `./processors/process-work-order-auto-allocation.js`, `./queues/connection.js`. |
| `env.ts` | 45 | Zod-parsed worker environment (Redis URL, concurrency, lock duration, Railway env / service name). Falls back to `REDIS_URL` if `QUEUE_REDIS_URL` not set. | `WorkerEnvironment` (type), `getWorkerEnvironment` | `zod`. |
| `queues/connection.ts` | 7 | Builds a BullMQ `ConnectionOptions` from the worker env's `queueRedisUrl` via `parseRedisConnectionUrl`. | `createQueueConnection` | `bullmq`: `type ConnectionOptions`. `@builders/lib`: `parseRedisConnectionUrl`. Local: `../env.js`. |
| `processors/process-work-order-auto-allocation.ts` | 7 | Thin shim that delegates to `application/process-work-order-auto-allocation.ts`'s factory. | `createWorkOrderAutoAllocationProcessor` | Local: `../application/process-work-order-auto-allocation.js`. |
| `application/process-work-order-auto-allocation.ts` | 18 | Factory that returns an async function calling `processWorkOrderAutoAllocationRunUseCase` from `@builders/application`. Re-exports `WorkOrderAutoAllocationAttemptContext` type. | `createProcessWorkOrderAutoAllocationUseCase`, `WorkOrderAutoAllocationAttemptContext` (re-export) | `@builders/application`: `processWorkOrderAutoAllocationRunUseCase`, `type WorkOrderAutoAllocationAttemptContext`. `@builders/domain`: `type AutoAllocateWorkOrderJobV1`. Local: `../env.js`. |

### 5.3 Entry point

`bootstrap.ts` is the worker's process entry. `package.json:start` is `node ../../run-with-root-env.mjs dist/bootstrap.js`. The bottom of the file invokes `main()` and converts thrown errors into a structured fatal log:

```typescript
// apps/worker/src/bootstrap.ts:130-139
main().catch((error) => {
  logStructuredEvent({
    level: "error",
    service: "worker",
    message: "Worker fatal startup error",
    action: "worker.fatal",
    error,
  })
  process.exitCode = 1
})
```

(Note: this fatal-log call omits the required `environment` field on `StructuredLogEvent`, which surfaces as a tsc error — see §10.2.)

### 5.4 BullMQ wiring

BullMQ is imported and used in `bootstrap.ts`. The worker:

- Defines exactly one queue: `WORK_ORDER_AUTO_ALLOCATION_QUEUE` (the literal `"flooring-work-order-auto-allocation"`, exported by `@builders/domain`).
- Constructs a `new Worker<AutoAllocateWorkOrderJobV1>(WORK_ORDER_AUTO_ALLOCATION_QUEUE, async (job) => { ... }, { connection, concurrency, lockDuration })`.
- Wraps the job handler in a `try/catch` that converts non-retryable `WorkflowProcessingError` into BullMQ's `UnrecoverableError` (the rest re-throw and BullMQ retries per its own policy).
- Constructs a sibling `QueueEvents` instance to receive lifecycle events (`active`, `completed`, `failed`).
- No deterministic job ID dedup pattern is implemented at the worker side. The relay assigns the BullMQ `jobId` (see §6.6) and BullMQ-level deduplication happens producer-side.

The single registered job handler, verbatim:

```typescript
// apps/worker/src/bootstrap.ts:19-39
const autoAllocationWorker = new Worker<AutoAllocateWorkOrderJobV1>(
  WORK_ORDER_AUTO_ALLOCATION_QUEUE,
  async (job) => {
    try {
      return await processAutoAllocation(parseAutoAllocateWorkOrderJob(job.data), env, {
        attemptNumber: job.attemptsMade + 1,
        maxAttempts: typeof job.opts.attempts === "number" ? job.opts.attempts : 1,
      })
    } catch (error) {
      if (isWorkflowProcessingError(error) && !error.retryable) {
        throw new UnrecoverableError(error.message)
      }
      throw error
    }
  },
  {
    connection,
    concurrency: env.autoAllocationWorkerConcurrency,
    lockDuration: env.autoAllocationWorkerLockDurationMs,
  },
)
```

### 5.5 Existing handlers

One handler exists: `processAutoAllocation` (the work-order auto-allocation processor). Its current state:

- **Topic / queue name:** `WORK_ORDER_AUTO_ALLOCATION_QUEUE` = `"flooring-work-order-auto-allocation"`.
- **Status: dead code.** The worker references `processWorkOrderAutoAllocationRunUseCase` and `WorkOrderAutoAllocationAttemptContext` from `@builders/application`. Both are missing (§10.2 captures the tsc errors). There is no `work-orders/` directory in `packages/application/src/flooring/`. The use case and its companion type were never installed — or were removed and the worker shim is what's left.
- **Currently registered with the worker process:** Yes, the `bootstrap.ts` does construct the `Worker` and wires it to the queue. But its handler call-chain is broken — the worker process won't successfully build, so it cannot actually run.
- **Producer:** Nothing in this repo currently writes a `WORK_ORDER_AUTO_ALLOCATION_REQUESTED_OUTBOX_TOPIC` event to `queueOutboxEvent`. Confirmed via `grep -rn createQueueOutboxEvent packages/ apps/` returning zero non-source matches (see §7.3).

References to work-order allocation in the worker tree:
- `apps/worker/src/bootstrap.ts:3` — `WORK_ORDER_AUTO_ALLOCATION_QUEUE`
- `apps/worker/src/bootstrap.ts:4` — `parseAutoAllocateWorkOrderJob`
- `apps/worker/src/bootstrap.ts:6` — `type AutoAllocateWorkOrderJobV1`
- `apps/worker/src/bootstrap.ts:18` — `createWorkOrderAutoAllocationProcessor`
- `apps/worker/src/processors/process-work-order-auto-allocation.ts` — entire file delegates to the application factory
- `apps/worker/src/application/process-work-order-auto-allocation.ts` — entire file imports the missing `processWorkOrderAutoAllocationRunUseCase` from `@builders/application`

The user's flag ("the work order allocation job is dead code") is corroborated: the application-layer use case it depends on is not present in the source tree, so the worker cannot run.

### 5.6 Application layer integration

The worker integrates with `@builders/application` at exactly one site:

```typescript
// apps/worker/src/application/process-work-order-auto-allocation.ts:1-5
import {
  processWorkOrderAutoAllocationRunUseCase,
  type WorkOrderAutoAllocationAttemptContext,
} from "@builders/application"
import type { AutoAllocateWorkOrderJobV1 } from "@builders/domain"
```

The wiring is one level of indirection: BullMQ handler → factory → use case. The factory takes no parameters and the resulting function takes `(job, env, attemptContext)`. There is no `tx` or `client` threaded into the use case from the worker — the worker delegates the entire transactional concern to the use case.

Both names imported from `@builders/application` do not currently exist there. tsc reports:

```
src/application/process-work-order-auto-allocation.ts(2,3): error TS2305: Module '"@builders/application"' has no exported member 'processWorkOrderAutoAllocationRunUseCase'.
src/application/process-work-order-auto-allocation.ts(3,8): error TS2305: Module '"@builders/application"' has no exported member 'WorkOrderAutoAllocationAttemptContext'.
```

### 5.7 Database transaction pattern

The worker handler (live code in `bootstrap.ts`) does not call `withDatabaseTransaction` itself, does not pass a `tx` into a use case, and does not access `db` directly. Database environment is read once at startup (`getDatabaseEnvironment()` at `bootstrap.ts:15`) — that's the only DB-side touch.

The only transactional pattern would be inside the missing `processWorkOrderAutoAllocationRunUseCase`. The shim layer in `apps/worker/src/application/process-work-order-auto-allocation.ts` does not open transactions; it forwards directly to the application use case. That is the precedent: **worker holds no transactional knowledge; it forwards to a self-contained use case.**

### 5.8 Logging / telemetry

The worker uses `logStructuredEvent` from `@builders/lib`. Five call sites in `bootstrap.ts`:

- `worker.workOrders.autoAllocation.active` — on job pickup (active)
- `worker.workOrders.autoAllocation.completed` — on success
- `worker.workOrders.autoAllocation.failed` — on failure (`level: "error"`)
- `worker.ready` — once the worker waits-until-ready
- `worker.fatal` — top-level uncaught error

`StructuredLogEvent` (from `packages/lib/src/structured-logging.ts`) is a typed object with `service`, `environment` (required), `message`, optional `level`, and several optional context fields (`requestId`, `workOrderId`, `generationId`, `idempotencyKey`, `queueJobId`, `attempt`, `details`, `error`). Output is JSON-serialized to `console.info` / `console.warn` / `console.error` based on `level`. **No Sentry integration**, no external sink — just `console`.

The `worker.fatal` call site at `bootstrap.ts:131` omits `environment`. tsc flags it.

### 5.9 Configuration

Worker config is read via `getWorkerEnvironment(process.env)` (Zod-validated). Required and accepted env vars:

- `QUEUE_REDIS_URL` or `REDIS_URL` (one is required) — Redis connection string for BullMQ
- `AUTO_ALLOCATION_WORKER_CONCURRENCY` (default: `1`)
- `AUTO_ALLOCATION_WORKER_LOCK_DURATION_MS` (default: `300_000`)
- `RAILWAY_ENVIRONMENT_NAME` (optional; falls back to `NODE_ENV` then `"development"`)
- `RAILWAY_SERVICE_NAME` (optional; falls back to `"bullmq-api-worker"`)

To start, the worker needs:
- A reachable Redis instance (URL above)
- A reachable Postgres database (the database env is consumed via `getDatabaseEnvironment()` from `@builders/db`; Prisma reads `DATABASE_URL` etc. from `.env`)

There is no separate config helper or service abstraction — all config flows through `env.ts`.

## 6. Relay layer (`apps/relay/src/`)

### 6.1 Directory structure

```
apps/relay/
├── README.md
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── dist/
├── node_modules/
├── tests/
└── src/
    ├── bootstrap.ts
    ├── bull-board.ts
    ├── env.ts
    ├── express-shim.d.ts
    └── dispatch/
        ├── bullmq-idempotent-dispatch.ts
        ├── bullmq-job-id.ts
        └── work-order-allocation-outbox-dispatcher.ts
```

7 `.ts` source files under `src/`. Total: 582 lines.

### 6.2 Per-file inventory

| File | Lines | Purpose | Named exports | External imports |
|---|---|---|---|---|
| `bootstrap.ts` | 86 | Relay process entry. Constructs the BullMQ `Queue`, builds the work-order outbox dispatcher, optionally starts Bull Board, runs the polling loop with sleep + shutdown handling. | `main` (called immediately) | `@builders/db`: `getDatabaseEnvironment`. `@builders/domain`: `WORK_ORDER_AUTO_ALLOCATION_QUEUE`, `type AutoAllocateWorkOrderJobV1`. `@builders/lib`: `logStructuredEvent`, `parseRedisConnectionUrl`. `bullmq`: `Queue`. Local: `./bull-board.js`, `./dispatch/work-order-allocation-outbox-dispatcher.js`, `./env.js`. |
| `bull-board.ts` | 107 | Optional Bull Board admin UI. Express server, basic-auth middleware, exposes a single `Queue` adapter in read-only mode. | `startBullBoardServer` | `@bull-board/api`: `createBullBoard`, `BullMQAdapter`. `@bull-board/express`: `ExpressAdapter`. `@builders/domain`: `type AutoAllocateWorkOrderJobV1`. `@builders/lib`: `logStructuredEvent`. `bullmq`: `type Queue`. `express`. `node:http`: `type Server`. Local: `./env.js`. |
| `env.ts` | 118 | Zod-parsed relay env: Redis URL, batch size, poll interval, claim TTL, max attempts, Bull Board config, Railway service / env names. | `RelayEnvironment` (type), `getRelayEnvironment` | `zod`. |
| `express-shim.d.ts` | 7 | Type-only shim. (Not read in detail.) | n/a | n/a |
| `dispatch/bullmq-idempotent-dispatch.ts` | 31 | Helper that calls `queue.add(name, data, options)` with a deterministic `jobId`; on duplicate-error, looks up the existing job and returns `wasDuplicate: true`. | `addBullMqJobIdempotently` | `bullmq`: `type Job`, `type JobsOptions`. |
| `dispatch/bullmq-job-id.ts` | 3 | Pure function: base64url-encoded idempotency key. | `toBullMqJobId` | none |
| `dispatch/work-order-allocation-outbox-dispatcher.ts` | 230 | Polling-loop body for the work-order auto-allocation topic. Lists claimable events, claims one, builds the BullMQ job payload, calls `addBullMqJobIdempotently`, marks the outbox event dispatched and the allocation run queued in the same DB transaction. Handles per-batch retry/exhaust transitions. | `WorkOrderAllocationOutboxDispatcherDependencies` (type), `createWorkOrderAllocationOutboxDispatcher` | `@builders/db`: `claimQueueOutboxEvent`, `exhaustQueueOutboxEvent`, **`failWorkOrderAllocationRun`** (missing), `listClaimableQueueOutboxEvents`, `markQueueOutboxEventDispatched`, **`queueWorkOrderAllocationRun`** (missing), `retryQueueOutboxEvent`, `withDatabaseTransaction`, `type QueueOutboxEventRecord`. `@builders/domain`: `AUTO_ALLOCATE_WORK_ORDER_JOB`, `parseWorkOrderAutoAllocationRequestedOutboxEvent`, `WORK_ORDER_AUTO_ALLOCATION_REQUESTED_OUTBOX_TOPIC`, `WORK_ORDER_AUTO_ALLOCATION_RETRY_POLICY`, `type AutoAllocateWorkOrderJobV1`. `@builders/lib`: `logStructuredEvent`. `bullmq`: `type Queue`. Local: `../env.js`, `./bullmq-idempotent-dispatch.js`, `./bullmq-job-id.js`. |

### 6.3 Entry point and main loop

`bootstrap.ts` is the relay's process entry. Loop body, verbatim:

```typescript
// apps/relay/src/bootstrap.ts:55-70
while (!shuttingDown) {
  try {
    await allocationDispatcher.dispatchBatch(env, autoAllocationQueue)
  } catch (error) {
    logStructuredEvent({
      level: "error",
      service: env.serviceName,
      environment: env.environmentName,
      message: "Relay dispatch loop failed",
      action: "relay.loop",
      error,
    })
  }

  await sleep(env.pollIntervalMs)
}
```

Sleep-poll loop pattern. Default `pollIntervalMs: 2_000`, `batchSize: 20`, `claimTtlMs: 30_000`, `maxAttempts: 5`. Shutdown is handled by setting a local `shuttingDown` flag from `SIGINT` / `SIGTERM` handlers; loop terminates after the next sleep.

### 6.4 Outbox polling pattern

Polling logic lives in `work-order-allocation-outbox-dispatcher.ts:dispatchBatch`. The relay:

- Calls `listClaimableQueueOutboxEvents({ limit, now, lockStaleBefore, topic })` with a topic filter (currently hard-coded to `WORK_ORDER_AUTO_ALLOCATION_REQUESTED_OUTBOX_TOPIC`).
- For each candidate, calls `claimQueueOutboxEvent({ eventId, lockedAt: now, lockedBy: env.serviceName, lockStaleBefore })` — a `WHERE` predicated `updateMany` that flips `PENDING → PROCESSING` only if the event is not currently locked or has a stale lock. Returns `null` if the row was claimed by another instance in the meantime.
- Successfully claimed events: parses payload, calls `addBullMqJobIdempotently` to enqueue the BullMQ job, then in a **single `withDatabaseTransaction`** marks the outbox event `DISPATCHED` (`markQueueOutboxEventDispatched`) and the allocation run `QUEUED` (`queueWorkOrderAllocationRun` — currently missing from `@builders/db`).

State transitions:

- `PENDING` → `PROCESSING` via `claimQueueOutboxEvent.updateMany` (advisory time-based lock through `lockedAt` / `lockedBy` columns; no `pg_advisory_lock`)
- `PROCESSING` → `DISPATCHED` via `markQueueOutboxEventDispatched` (clears `lockedAt` / `lockedBy` / `lastError`, stamps `dispatchedAt`)
- `PROCESSING` → `PENDING` (retry) via `retryQueueOutboxEvent` (sets `availableAt` to a backoff and clears the lock)
- `PROCESSING` → `EXHAUSTED` via `exhaustQueueOutboxEvent` (terminal)

The exhaust-vs-retry decision is made by `handleDispatchFailure(env, event, ..., dependencies)` based on `event.attemptCount >= env.maxAttempts`.

Locking is row-level + time-based, not Postgres advisory locks. The `lockStaleBefore` parameter (`now - claimTtlMs`) decides when an existing lock is "expired" and re-claimable.

### 6.5 Topic → queue routing

There is no general topic-to-queue routing table. The work-order dispatcher hard-codes its single topic in `dispatchBatch`:

```typescript
// dispatch/work-order-allocation-outbox-dispatcher.ts:117-124
const candidates = await dependencies.listClaimableEvents({
  limit: env.batchSize,
  now,
  lockStaleBefore,
  topic: WORK_ORDER_AUTO_ALLOCATION_REQUESTED_OUTBOX_TOPIC,
})
```

After claiming, a defensive check runs:

```typescript
// dispatch/work-order-allocation-outbox-dispatcher.ts:140-159
if (claimed.topic !== WORK_ORDER_AUTO_ALLOCATION_REQUESTED_OUTBOX_TOPIC) {
  const unsupportedTopicError = `Unsupported outbox topic: ${claimed.topic}`
  await dependencies.exhaustEvent({
    eventId: claimed.id,
    lastError: unsupportedTopicError,
  })
  // ... structured log "outbox.event.exhausted" ...
  continue
}
```

Unknown topics are exhausted (terminal state). There is **no fan-out dispatch loop** — a second topic (e.g., `IMPORT_MATERIALIZE_TOPIC` or `FINALIZE_CUT_LOG_TOPIC`) would need its own dispatcher factory + loop, or a refactor to a topic-keyed registry.

`bootstrap.ts` constructs exactly one dispatcher and exactly one queue:

```typescript
// apps/relay/src/bootstrap.ts:22-25
const autoAllocationQueue = new Queue<AutoAllocateWorkOrderJobV1>(WORK_ORDER_AUTO_ALLOCATION_QUEUE, {
  connection,
})
const allocationDispatcher = createWorkOrderAllocationOutboxDispatcher()
```

### 6.6 BullMQ producer wiring

Yes, the relay produces BullMQ jobs. The deterministic job ID pattern:

```typescript
// dispatch/bullmq-job-id.ts (entire file)
export function toBullMqJobId(idempotencyKey: string) {
  return Buffer.from(idempotencyKey, "utf8").toString("base64url")
}
```

The idempotency key carried in `payloadJson.idempotencyKey` becomes (after base64url encoding) the BullMQ `jobId`. The base64url encoding is needed because BullMQ requires job IDs to be filename-safe and the original idempotency key may contain `/` or `+`. Producer-side dedup is handled by `addBullMqJobIdempotently`:

```typescript
// dispatch/bullmq-idempotent-dispatch.ts (entire file body)
export async function addBullMqJobIdempotently<TData, TName extends string>(
  queue: QueueLike<TData, TName>,
  name: TName,
  data: TData,
  options: JobsOptions & { jobId: string },
): Promise<{ job: Job<TData, unknown, TName>; wasDuplicate: boolean }> {
  try {
    const job = await queue.add(name, data, options)
    return { job, wasDuplicate: false }
  } catch (error) {
    const existingJob = await queue.getJob(options.jobId)
    if (existingJob) {
      return { job: existingJob, wasDuplicate: true }
    }
    throw error
  }
}
```

The retry policy on `queue.add` comes from the domain constant `WORK_ORDER_AUTO_ALLOCATION_RETRY_POLICY` (spread into the options object).

### 6.7 Error handling

- Per-event retry: `handleDispatchFailure` reads `event.attemptCount >= env.maxAttempts` and either calls `exhaustEvent` (terminal) or `retryEvent` with an exponential-backoff `availableAt` capped at 15 minutes.
- Loop-level errors: caught in the outer `try/catch` in `bootstrap.ts:55-70` and logged as `relay.loop` errors; the loop continues.
- Bull Board failures: not observed (the server starts pre-loop and is closed on shutdown).
- No Sentry integration. Errors flow to `logStructuredEvent` (which writes JSON to `console.error`).
- The exhaust path also calls `failWorkOrderAllocationRun` (currently missing from `@builders/db`) inside a `withDatabaseTransaction` so the allocation-run row's failure status and the outbox event's exhausted status flip atomically.

## 7. Outbox infrastructure

### 7.1 File inventory

`packages/db/src/queues/` contains one file:

| File | Lines | Purpose |
|---|---|---|
| `outbox-repository.ts` | 275 | `queue_outbox_event` table read/write primitives. State-machine transitions (`PENDING` → `PROCESSING` → `DISPATCHED` / `EXHAUSTED`). Exports a typed `QueueOutboxEventRecord`, the producer-side `createQueueOutboxEvent`, the relay-side `listClaimableQueueOutboxEvents`, `claimQueueOutboxEvent`, `markQueueOutboxEventDispatched`, `retryQueueOutboxEvent`, `exhaustQueueOutboxEvent`. |

The barrel at `packages/db/src/index.ts:24` re-exports it: `export * from "./queues/outbox-repository.js"`. All seven exports are reachable through `@builders/db`.

### 7.2 Outbox repository surface

| Function | Params (verbatim) | Used by |
|---|---|---|
| `createQueueOutboxEvent` | `(input: { topic; aggregateType; aggregateId; idempotencyKey; payloadJson: Prisma.InputJsonValue; availableAt?: Date }, client: OutboxDbClient = db)` | nobody (see §7.3) |
| `listClaimableQueueOutboxEvents` | `(input: { limit; now?; lockStaleBefore?; topic? }, client: OutboxDbClient = db)` | relay dispatcher |
| `claimQueueOutboxEvent` | `(input: { eventId; lockedAt?; lockedBy; lockStaleBefore? }, client: OutboxDbClient = db)` | relay dispatcher |
| `markQueueOutboxEventDispatched` | `(input: { eventId; dispatchedAt? }, client: OutboxDbClient = db)` | relay dispatcher |
| `retryQueueOutboxEvent` | `(input: { eventId; availableAt; lastError }, client: OutboxDbClient = db)` | relay dispatcher |
| `exhaustQueueOutboxEvent` | `(input: { eventId; lastError }, client: OutboxDbClient = db)` | relay dispatcher |

Producer-side write, verbatim:

```typescript
// packages/db/src/queues/outbox-repository.ts:80-105
export async function createQueueOutboxEvent(
  input: {
    topic: string
    aggregateType: string
    aggregateId: string
    idempotencyKey: string
    payloadJson: Prisma.InputJsonValue
    availableAt?: Date
  },
  client: OutboxDbClient = db,
) {
  const event = await client.queueOutboxEvent.create({
    data: {
      topic: input.topic,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      idempotencyKey: input.idempotencyKey,
      payloadJson: input.payloadJson,
      status: "PENDING",
      availableAt: input.availableAt ?? new Date(),
    },
    select: queueOutboxEventSelect,
  })

  return toQueueOutboxEventRecord(event)
}
```

`OutboxDbClient = Prisma.TransactionClient | typeof db`. The producer accepts an optional client — meaning sweep 4's worker-facing use case can call it with the `tx` opened by `withDatabaseTransaction`.

### 7.3 Producer call site inventory

`grep -rn "createQueueOutboxEvent" packages/ apps/ | grep -v dist | grep -v node_modules` returns:

```
packages/db/src/queues/outbox-repository.ts:80:export async function createQueueOutboxEvent(
```

Exactly one match: the declaration. **No other file in the repo calls `createQueueOutboxEvent`.** The work-order auto-allocation flow has never written to the outbox in this codebase — there is no producer site, only the consumer (relay).

## 8. Cross-cutting concerns

### 8.1 `withDatabaseTransaction` consumers

96 references across `packages/application/src/`, spanning every non-`account/`-write module. Inside the in-scope modules: 14 references in 7 files. Selected sites for in-scope code:

```
packages/application/src/flooring/imports/create-import.ts:5, 20
packages/application/src/flooring/imports/update-import.ts:6, 39
packages/application/src/flooring/imports/save-inventory-rows.ts:6, 192
packages/application/src/flooring/imports/delete-import.ts:5, 17
packages/application/src/flooring/inventory/create-inventory.ts:7, 25
packages/application/src/flooring/inventory/update-inventory.ts:8, 29
packages/application/src/flooring/inventory/delete-inventory.ts:5, 17
```

Pattern is uniform: import in the top-level `import { ..., withDatabaseTransaction } from "@builders/db"` block, call once as `return withDatabaseTransaction(async (tx) => { const c = client ?? tx; ... })`.

### 8.2 Application errors barrel

`packages/application/src/index.ts` does `export * from "./flooring/imports/index.js"` and `export * from "./flooring/inventory/index.js"`. Each of those barrels does `export * from "./errors.js"`. Therefore:

- `ImportExecutionError` and `ImportErrorCode` are reachable through `@builders/application`. ✓
- `InventoryExecutionError` and `InventoryErrorCode` are reachable through `@builders/application`. ✓
- `StagedInventoryExecutionError` and `StagedInventoryErrorCode` — **do not exist anywhere in the application layer.** No staged-inventory-rows module exists; nothing to barrel.

### 8.3 Error code prefixes

Per-module prefix conventions (extracted from each `errors.ts`):

- `flooring/contacts` → `CONTACT_*`
- `flooring/imports` → `IMPORT_*`
- `flooring/inventory` → `INVENTORY_*` (with one outlier: `IMPORTED_REVERSAL_NOT_ALLOWED`)
- `flooring/manufacturers` → `MANUFACTURER_*`
- `flooring/products` → `PRODUCT_*` (re-exports from `@builders/domain` rather than declaring locally)
- `flooring/services` → `SERVICE_*`
- `flooring/warehouses` → `WAREHOUSE_*`
- `management/management-companies` → `MANAGEMENT_COMPANY_*`
- `management/properties` → `PROPERTY_*`
- `management/job-types` → `JOB_TYPE_*`
- `management/templates` → `TEMPLATE_*`
- `management/templates/material-items` → `TEMPLATE_MATERIAL_ITEM_*`
- `admin` → `GOVERNANCE_*`
- `account` → `code: string` (no enum union)

Sweep-3 reservation: `inventory/errors.ts` lists `CUT_LOG_INVENTORY_NOT_IMPORTED` and `CUT_LOG_EXCEEDS_STARTING_BALANCE` as `// Sweep-3 reserved:` codes despite using a `CUT_LOG_*` prefix that is otherwise foreign to the inventory module's `INVENTORY_*` convention.

The `IMPORTED_REVERSAL_NOT_ALLOWED` outlier (no `INVENTORY_*` prefix) is a single existing exception. Whether `STAGED_*` or `STAGED_INVENTORY_*` is the right prefix for sweep 4's new module is a convention choice; there is no precedent yet.

## 9. Pending Use Case Installs cross-check

**Document not located.** Searched the repository for `Pending Application Use Case Installs`, `Pending Use Case Install`, `expectedUpdatedAt` in conjunction with `markStagedRowsForImportUseCase`, `Decision A`, `Decision B`, `saveImportInventoryRowsUseCase deleted`. No file under `docs/`, `.claude/`, or the repo root contains the pre-resolved decisions document. Possible locations: external notes (the user's local file system, an issue tracker, a chat thread). The cross-check below is performed against the prompt's own enumeration of decisions A through F.

### 9.1 Decision A — worker handler opens transaction, passes `tx` to worker use case

**Codebase makes this hard to honor as stated.** The current worker pattern (apps/worker/src/bootstrap.ts + processors + application shim) does *not* open transactions in the worker. The job handler delegates a job-shaped argument straight into `processWorkOrderAutoAllocationRunUseCase(job, attemptContext)` — no `tx`. This precedent says "use case opens its own transaction, worker stays transactional-agnostic."

Switching to "worker opens, passes `tx`" would invert the established worker shape. The cut-log sweep-3 mutation primitives now require `tx` first, but the *use case* is the natural caller of `withDatabaseTransaction`, not the worker. Decision A as stated would require the worker handler to call `withDatabaseTransaction(async (tx) => useCase(payload, tx))`, which is contrary to the existing application-layer convention where each use case calls `withDatabaseTransaction` itself.

Cited facts:
- `apps/worker/src/application/process-work-order-auto-allocation.ts:11-17` — worker shim has no transaction.
- `packages/application/CLAUDE.md` rule 3: "Every use case accepts optional `client` parameter for transaction propagation."
- `packages/application/src/flooring/imports/save-inventory-rows.ts:192` — `saveImportInventoryRowsUseCase` opens its own `withDatabaseTransaction`.

### 9.2 Decision B — use case calls `@builders/db` outbox repo directly

**Codebase makes this easy to honor.** `createQueueOutboxEvent` accepts an optional `client: OutboxDbClient = db`, where `OutboxDbClient = Prisma.TransactionClient | typeof db`, so an application use case can call it inside a `withDatabaseTransaction(async (tx) => createQueueOutboxEvent(input, tx))` block. The package-CLAUDE.md rule 4 ("Outbox writes are always in the same transaction as the state mutation") aligns with this.

Cited facts:
- `packages/db/src/queues/outbox-repository.ts:80-105` — producer signature accepts `client`.
- `packages/db/src/index.ts:24` — barrel re-exports it.
- `packages/application/CLAUDE.md` rule 4 — outbox + state mutation co-transaction.

### 9.3 Decision C — worker use cases stay agnostic of telemetry

**Codebase already enforces this.** `packages/application/src/` has zero references to `withMutationTelemetry`, zero imports from `@builders/lib`, zero imports from `@/modules/...`. The worker logs job lifecycle events at the BullMQ handler boundary in `bootstrap.ts`; the use case's only obligation is to throw or return.

Cited facts:
- §2.6 above — telemetry is wrapped at the route handler / worker handler, not at the use case.
- `packages/application/CLAUDE.md` rule 1: only `@builders/domain` and `@builders/db` imports allowed.
- `apps/worker/src/bootstrap.ts:44-96` — worker emits telemetry around the use-case call, not from inside it.

### 9.4 Decision D — `saveImportInventoryRowsUseCase` deleted entirely

**Easy to honor.** `saveImportInventoryRowsUseCase` is currently broken (5 distinct tsc errors, depends on the non-existent `applyImportInventoryRowsDiff`, the removed `isImported` column, the removed `InventoryRowUpdatePatch.productId` field). Its only consumers are:
- `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts`
- `apps/web/app/api/imports/_validators.ts`

Both are also currently broken (the prior sweep audits document this). Deletion involves removing the file, removing its line from `imports/index.ts`, removing the `SaveImportInventoryRowsResult` type from `imports/types.ts`, and dropping or rewriting the API route. Nothing internal to the application layer depends on the use case.

Cited facts:
- §3.1 and §4 above for the file's broken state.
- `packages/application/src/flooring/imports/index.ts:6` — barrel line to remove.
- `grep saveImportInventoryRowsUseCase` returns 3 hits: the file itself, the `_validators.ts` route validator, and the `route.ts` handler.

### 9.5 Decision E — module structure with `staged-inventory-rows/` subfolder

**No precedent for or against.** The application layer has parallel-sibling modules (`imports/`, `inventory/`, `manufacturers/`, etc.) but no nested submodule under any of them. (`management/templates/material-items/` is the closest precedent — a sub-resource folder under a parent module, with its own `errors.ts`, `types.ts`, `index.ts`, and CRUD files.) Creating `imports/staged-inventory-rows/` would mirror that pattern.

Cited facts:
- `packages/application/src/management/templates/material-items/` exists with the same nested shape.
- `packages/application/src/flooring/imports/index.ts:6` — current `imports/` barrel only `export *`s siblings, no nested barrel reference yet.
- §1.2 — the directory currently does not exist.

### 9.6 Decision F — `expectedUpdatedAt` on `markStagedRowsForImportUseCase`

**Codebase makes this consistent with prior precedent.** `expectedUpdatedAt` is the optimistic-lock receipt convention used in the existing `saveImportInventoryRowsUseCase` (currently broken, but the pattern is in source) at `save-inventory-rows.ts:148-159` (modified rows) and `:172-183` (deleted rows). The domain types already declare `expectedUpdatedAt: string` on diff entries (`packages/domain/src/flooring/imports/staged-inventory-rows/diff/types.ts`, `packages/domain/src/flooring/inventory/diff/types.ts`).

Cited facts:
- `packages/application/src/flooring/imports/save-inventory-rows.ts:132-185` — `assertRowVersions` is the established staleness-check pattern. It throws `INVENTORY_STALE_ROW_VERSION` with `status: 409` when `current.updatedAt.toISOString() !== entry.expectedUpdatedAt`.
- `grep expectedUpdatedAt packages/domain/src/` confirms 3 declaring files.

## 10. Live errors

### 10.1 `packages/application`

`cd packages/application && npx tsc --noEmit` — 42 distinct error rows. Verbatim:

```
src/flooring/imports/create-import.ts(3,3): error TS2305: Module '"@builders/db"' has no exported member 'createImport'.
src/flooring/imports/create-import.ts(23,46): error TS2345: Argument of type 'CreateImportInput' is not assignable to parameter of type 'ImportPrimaryForm'.
  Property 'manufacturerId' is missing in type 'CreateImportInput' but required in type 'ImportPrimaryForm'.
src/flooring/imports/delete-import.ts(3,3): error TS2724: '"@builders/db"' has no exported member named 'deleteImportById'. Did you mean 'getImportById'?
src/flooring/imports/delete-import.ts(4,3): error TS2724: '"@builders/db"' has no exported member named 'getImportDeleteState'. Did you mean 'getProductDeleteState'?
src/flooring/imports/save-inventory-rows.ts(3,3): error TS2724: '"@builders/db"' has no exported member named 'applyImportInventoryRowsDiff'. Did you mean 'applyStagedInventoryRowsDiff'?
src/flooring/imports/save-inventory-rows.ts(44,7): error TS2353: Object literal may only specify known properties, and 'isImported' does not exist in type 'FlooringInventorySelect<DefaultArgs>'.
src/flooring/imports/save-inventory-rows.ts(49,3): error TS2322: Type '{ id: string; productId: string; itemNumber: string | null; locationId: string | null; warehouseId: string; isImported: any; updatedAt: Date; cutLogsCount: any; }[]' is not assignable to type 'ExistingRowMeta[]'.
  Type '{ id: string; productId: string; itemNumber: string | null; locationId: string | null; warehouseId: string; isImported: any; updatedAt: Date; cutLogsCount: any; }' is not assignable to type 'ExistingRowMeta'.
    Types of property 'itemNumber' are incompatible.
      Type 'string | null' is not assignable to type 'string'.
        Type 'null' is not assignable to type 'string'.
src/flooring/imports/save-inventory-rows.ts(55,21): error TS2339: Property 'isImported' does not exist on type '{ warehouseId: string; notes: string | null; id: string; inventoryNumber: string; importEntryId: string | null; productId: string; categorySlug: string; stockUnitName: string | null; stockUnitAbbrev: string | null; ... 17 more ...; updatedAt: Date; }'.
src/flooring/imports/save-inventory-rows.ts(57,23): error TS2339: Property '_count' does not exist on type '{ warehouseId: string; notes: string | null; id: string; inventoryNumber: string; importEntryId: string | null; productId: string; categorySlug: string; stockUnitName: string | null; stockUnitAbbrev: string | null; ... 17 more ...; updatedAt: Date; }'.
src/flooring/imports/save-inventory-rows.ts(85,22): error TS2339: Property 'productId' does not exist on type 'InventoryRowUpdatePatch'.
src/flooring/imports/save-inventory-rows.ts(85,61): error TS2339: Property 'productId' does not exist on type 'InventoryRowUpdatePatch'.
src/flooring/imports/save-inventory-rows.ts(121,3): error TS2322: Type '{ id: string; productId: string; itemNumber: string; locationId: string | null; warehouseId: string | null; cutLogsCount: number; isImported: boolean; }[]' is not assignable to type 'DiffExistingInventoryRow[]'.
  Type '{ id: string; productId: string; itemNumber: string; locationId: string | null; warehouseId: string | null; cutLogsCount: number; isImported: boolean; }' is not assignable to type 'DiffExistingInventoryRow'.
    Types of property 'warehouseId' are incompatible.
      Type 'string | null' is not assignable to type 'string'.
        Type 'null' is not assignable to type 'string'.
src/flooring/imports/update-import.ts(5,3): error TS2305: Module '"@builders/db"' has no exported member 'updateImport'.
src/flooring/imports/update-import.ts(7,8): error TS2305: Module '"@builders/db"' has no exported member 'UpdateImportInput'.
src/flooring/imports/update-import.ts(10,3): error TS2305: Module '"@builders/domain"' has no exported member 'isImportStatus'.
src/flooring/imports/update-import.ts(11,3): error TS2305: Module '"@builders/domain"' has no exported member 'isImportTransportType'.
src/flooring/imports/update-import.ts(27,5): error TS2353: Object literal may only specify known properties, and 'transportType' does not exist in type 'ImportPrimaryForm'.
src/flooring/imports/update-import.ts(27,51): error TS2339: Property 'transportType' does not exist on type 'ImportPrimaryForm'.
src/flooring/imports/update-import.ts(28,37): error TS2339: Property 'status' does not exist on type 'ImportPrimaryForm'.
src/flooring/imports/update-import.ts(54,7): error TS2353: Object literal may only specify known properties, and 'transportType' does not exist in type 'ImportPrimaryForm'.
src/flooring/imports/update-import.ts(54,30): error TS2339: Property 'transportType' does not exist on type 'ImportRow'.
src/flooring/imports/update-import.ts(55,23): error TS2339: Property 'status' does not exist on type 'ImportRow'.
src/flooring/inventory/create-inventory.ts(3,3): error TS2305: Module '"@builders/db"' has no exported member 'createInventory'.
src/flooring/inventory/create-inventory.ts(10,3): error TS2724: '"@builders/domain"' has no exported member named 'describeInventoryValidationIssues'. Did you mean 'describeInventoryFormValidationIssues'?
src/flooring/inventory/create-inventory.ts(11,3): error TS2305: Module '"@builders/domain"' has no exported member 'validateInventoryInput'.
src/flooring/inventory/delete-inventory.ts(3,3): error TS2724: '"@builders/db"' has no exported member named 'deleteInventoryById'. Did you mean 'getInventoryById'?
src/flooring/inventory/update-inventory.ts(7,3): error TS2305: Module '"@builders/db"' has no exported member 'updateInventory'.
src/flooring/inventory/update-inventory.ts(9,8): error TS2724: '"@builders/db"' has no exported member named 'UpdateInventoryInput'. Did you mean 'UpdateInventoryRecordInput'?
src/flooring/inventory/update-inventory.ts(12,3): error TS2724: '"@builders/domain"' has no exported member named 'describeInventoryValidationIssues'. Did you mean 'describeInventoryFormValidationIssues'?
src/flooring/inventory/update-inventory.ts(13,3): error TS2305: Module '"@builders/domain"' has no exported member 'isImportedReversal'.
src/flooring/inventory/update-inventory.ts(14,3): error TS2305: Module '"@builders/domain"' has no exported member 'validateInventoryInput'.
src/flooring/inventory/update-inventory.ts(41,18): error TS2339: Property 'isImported' does not exist on type 'InventoryRow'.
src/flooring/inventory/update-inventory.ts(64,47): error TS2339: Property 'stockCount' does not exist on type 'InventoryRow'.
```

### 10.2 `apps/worker`

`cd apps/worker && npx tsc --noEmit` — 4 error rows total:

```
src/application/process-work-order-auto-allocation.ts(2,3): error TS2305: Module '"@builders/application"' has no exported member 'processWorkOrderAutoAllocationRunUseCase'.
src/application/process-work-order-auto-allocation.ts(3,8): error TS2305: Module '"@builders/application"' has no exported member 'WorkOrderAutoAllocationAttemptContext'.
src/bootstrap.ts(131,22): error TS2345: Argument of type '{ level: "error"; service: string; message: string; action: string; error: any; }' is not assignable to parameter of type 'StructuredLogEvent'.
  Property 'environment' is missing in type '{ level: "error"; service: string; message: string; action: string; error: any; }' but required in type 'StructuredLogEvent'.
```

### 10.3 `apps/relay`

`cd apps/relay && npx tsc --noEmit` — 8 error rows total:

```
src/bootstrap.ts(78,22): error TS2345: Argument of type '{ level: "error"; service: string; message: string; action: string; error: any; }' is not assignable to parameter of type 'StructuredLogEvent'.
  Property 'environment' is missing in type '{ level: "error"; service: string; message: string; action: string; error: any; }' but required in type 'StructuredLogEvent'.
src/dispatch/work-order-allocation-outbox-dispatcher.ts(4,3): error TS2305: Module '"@builders/db"' has no exported member 'failWorkOrderAllocationRun'.
src/dispatch/work-order-allocation-outbox-dispatcher.ts(7,3): error TS2305: Module '"@builders/db"' has no exported member 'queueWorkOrderAllocationRun'.
src/dispatch/work-order-allocation-outbox-dispatcher.ts(90,24): error TS2345: Argument of type '{ level: "error"; message: string; action: string; service: string; details: { outboxEventId: string; eventType: string; attempts: number; lastError: string; }; }' is not assignable to parameter of type 'StructuredLogEvent'.
  Property 'environment' is missing in type '{ level: "error"; message: string; action: string; service: string; details: { outboxEventId: string; eventType: string; attempts: number; lastError: string; }; }' but required in type 'StructuredLogEvent'.
src/dispatch/work-order-allocation-outbox-dispatcher.ts(146,30): error TS2345: Argument of type '{ level: "error"; message: string; action: string; service: string; details: { outboxEventId: string; eventType: string; attempts: number; lastError: string; }; }' is not assignable to parameter of type 'StructuredLogEvent'.
  Property 'environment' is missing in type '{ level: "error"; message: string; action: string; service: string; details: { outboxEventId: string; eventType: string; attempts: number; lastError: string; }; }' but required in type 'StructuredLogEvent'.
```

## 11. Open observations

1. **`packages/application/src/flooring/inventory/errors.ts:14-15` carries two `// Sweep-3 reserved:` codes** (`CUT_LOG_INVENTORY_NOT_IMPORTED`, `CUT_LOG_EXCEEDS_STARTING_BALANCE`). They use a `CUT_LOG_*` prefix that doesn't match the surrounding `INVENTORY_*` prefix. Sweep 3's actual report doesn't say where these reservations should land; they're orphan reservations.

2. **`packages/application/src/flooring/inventory/types.ts:17` declares `isImported?: boolean`** on `UpdateInventoryInput`, which has no corresponding column on the new schema. Inputs are still accepted by the use case (`update-inventory.ts:149`) but the value is dropped on the floor — except that the assignment to `dbInput.isImported` is itself a tsc error since the data-layer type no longer has that property. Currently a structural ghost.

3. **`IMPORTED_REVERSAL_NOT_ALLOWED`** is the only code in `InventoryErrorCode` that does not start with `INVENTORY_`. It's also the only code whose name encodes a verb-phrase (the rest are noun-phrases). Convention outlier.

4. **No application use case writes to the outbox.** §2.5 and §7.3 corroborate. Sweep 4's `markStagedRowsForImportUseCase` will be the first.

5. **The relay's outbox dispatcher is structured as a single-topic loop, not a topic-keyed registry.** Adding a second topic requires either (a) instantiating a second dispatcher in `bootstrap.ts` and a second BullMQ `Queue`, or (b) refactoring to a topic→queue→handler map. The unsupported-topic branch (`work-order-allocation-outbox-dispatcher.ts:140-159`) actively exhausts events with the wrong topic — it is not a no-op fall-through, so a new topic MUST get its own dispatcher (otherwise the relay would terminally exhaust the new events as soon as the work-order dispatcher claimed one).

6. **The relay imports two missing data symbols**: `failWorkOrderAllocationRun` and `queueWorkOrderAllocationRun` (§10.3). These would have been part of a work-order allocation runs table / repository that doesn't exist. The relay's terminal-failure transaction (`work-order-allocation-outbox-dispatcher.ts:79-89`) is structurally broken.

7. **The worker's `apps/worker/src/processors/process-work-order-auto-allocation.ts` is a 7-line passthrough** to the application factory in `apps/worker/src/application/process-work-order-auto-allocation.ts`. The two-file layer is structural overhead — neither file does meaningful work that the other doesn't.

8. **`@builders/application` is consumed by exactly one site outside `packages/application/src/`** that we audited: the worker's `application/process-work-order-auto-allocation.ts`. The relay does not import from `@builders/application`. The `apps/web/` consumers are out of audit scope but are known consumers.

9. **The auto-allocation flow has a complete consumer (relay + worker) with no producer.** The outbox event topic, payload schema, queue name, retry policy, and BullMQ job ID convention all live in `packages/domain/src/queue/`. The relay reads + dispatches, the worker consumes + processes. But nothing writes to the outbox. The flow is half a system.

10. **"Pending Application Use Case Installs" doc was not located in this repository.** §9 worked from the prompt's enumeration. If the document does exist, it lives outside this codebase.

11. **`packages/application/src/shared/` has only `prisma-errors.ts` and `slug.ts`.** No transaction helper, no error base class, no telemetry helper, no logger, no config wrapper. The application package is intentionally lean on cross-cutting infrastructure; modules duplicate the `client ?? tx` boilerplate per use case and the `*ExecutionError` class shape per module.

12. **`packages/db/dist/` was refreshed by sweep 3** (per that sweep's report). All sweep-2 outbox-and-staged primitives (`getImportLinkState`, `markStagedRowsForImport`, `materializeStagedRowsToInventory`) are now reachable through `@builders/db`. Sweep 4's application use cases can import them today.

13. **`packages/application/CLAUDE.md` rule 1** says "May import from `@builders/domain` and `@builders/db`. Nothing else." but the architecture doc at `docs/architecture/directories/4_application.md:48-49` says "May import: `@builders/domain`, `@builders/db`, Prisma types." — Prisma types are reachable through `@builders/db` (which re-exports `Prisma` from `@prisma/client`), so the docs aren't contradictory in practice, but the wording differs.

14. **`packages/application/src/flooring/imports/save-inventory-rows.ts` raw-SQL-locks the parent import row** (`save-inventory-rows.ts:196-198`) via `c.$queryRaw(Prisma.sql\`SELECT "id" FROM "flooring_import_entry" WHERE "id" = ${id} FOR UPDATE\`)`. This is the existing precedent for parent-row locking inside use cases — sweep 4's `markStagedRowsForImportUseCase` may need a similar pattern, or rely on the data-layer primitive's own lock contract.

15. **Domain queue files for not-yet-wired flows exist.** `packages/domain/src/queue/` contains `auto-allocate-work-order.ts`, `workflow-processing.ts`, `sync-inventory.ts`, `send-work-order.ts`. The first two have downstream consumers (relay + worker); the latter two appear to be pre-built domain contracts without any current consumer. Out of audit scope to verify in detail, but they suggest a pattern: domain payload schemas land first, consumers later.
