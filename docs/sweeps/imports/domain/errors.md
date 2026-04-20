# Imports Domain — Errors

## `ImportExecutionError`
Typed error class under `packages/domain/src/flooring/imports/errors.ts`. Construction signature:

```ts
class ImportExecutionError extends Error {
  readonly code: ImportExecutionErrorCode
  readonly status: number       // HTTP status the route should return
  readonly message: string
  readonly detail?: string
}
```

## Code union

```ts
export type ImportExecutionErrorCode =
  | "IMPORT_NOT_FOUND"              // 404 — id missing
  | "IMPORT_VALIDATION_FAILED"      // 400 — validator rejected input
  | "IMPORT_IN_USE"                 // 409 — delete blocked by domain rule
  | "IMPORT_UPDATE_CONFLICT"        // 409 — expectedUpdatedAt mismatch
  | "IMPORT_WAREHOUSE_NOT_FOUND"    // 400 — FK miss on warehouseId
```

## Usage pattern

Every imports use case throws `ImportExecutionError` for any domain-rule violation. Routes translate `error.status` to the HTTP response code and `error.code` + `error.message` to the JSON body via the canonical mutation-error surface.

Prisma errors that slip through the domain guards (e.g., `P2003` foreign-key violation on a race between the domain delete-state check and the final DELETE) are caught in the use case and re-thrown as the equivalent `ImportExecutionError` — clients never see a raw Prisma error code.
