# Cut Logs Domain — Errors

## `CutLogExecutionError`
Typed error class under `packages/domain/src/flooring/cut-logs/errors.ts`.

```ts
class CutLogExecutionError extends Error {
  readonly code: CutLogExecutionErrorCode
  readonly status: number
  readonly message: string
  readonly issues?: CutLogValidationIssue[]
}
```

## Code union

```ts
export type CutLogExecutionErrorCode =
  | "CUT_LOG_VALIDATION_FAILED"    // 400 — diff validator rejected
  | "CUT_LOG_ARITHMETIC_INVALID"   // 400 — before − cut ≠ after
  | "CUT_LOG_STATUS_INVALID"       // 400 — value not in CUT_LOG_STATUS_VALUES
  | "CUT_LOG_PARENT_MISMATCH"      // 400 — inventoryId / workOrderItemId links don't match parent context
  | "CUT_LOG_NOT_FOUND"            // 404 — modified/deleted id not in existing
  | "CUT_LOG_UPDATE_CONFLICT"      // 409 — expectedUpdatedAt mismatch
```

## What does NOT live here

Error codes about the **inventory row** or **work-order item** that a cut log references live in those modules' own error classes:

- `CUT_LOG_INVENTORY_NOT_IMPORTED` → `InventoryExecutionError` (it's a property of the inventory row's state, not the cut log).
- `CUT_LOG_EXCEEDS_STARTING_BALANCE` → `InventoryExecutionError` (invariant target is `inventory.stockAvailable`).

Parent use cases throw those via the inventory module's error class; cut-log errors are limited to issues inside the cut-log row itself.
