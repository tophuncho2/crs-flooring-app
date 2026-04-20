# Work Orders Domain — Errors

## `WorkOrderExecutionError`
Typed error class under `packages/domain/src/flooring/work-orders/errors.ts`.

```ts
class WorkOrderExecutionError extends Error {
  readonly code: WorkOrderExecutionErrorCode
  readonly status: number
  readonly message: string
  readonly issues?: WorkOrderValidationIssue[]
}
```

## Code union

```ts
export type WorkOrderExecutionErrorCode =
  | "WORK_ORDER_NOT_FOUND"              // 404
  | "WORK_ORDER_VALIDATION_FAILED"      // 400 — primary-section form validator rejected
  | "WORK_ORDER_IN_USE"                 // 409 — delete blocked (cut logs present)
  | "WORK_ORDER_UPDATE_CONFLICT"        // 409 — expectedUpdatedAt mismatch
  | "WORK_ORDER_PROPERTY_NOT_FOUND"     // 400 — FK miss on propertyId
  | "WORK_ORDER_TEMPLATE_NOT_FOUND"     // 400 — FK miss on templateId
  | "WORK_ORDER_WAREHOUSE_NOT_FOUND"    // 400 — FK miss on warehouseId
  | "MATERIAL_ITEMS_VALIDATION_FAILED"  // 400 — items diff validator rejected
  | "SERVICE_ITEMS_VALIDATION_FAILED"   // 400 — service-items diff validator rejected
  | "SALES_REPS_VALIDATION_FAILED"      // 400 — sales-reps diff validator rejected
  | "SALES_REP_DUPLICATE_CONTACT"       // 409 — P2002 on @@unique([workOrderId, contactId])
```

## Cross-module error forwarding

Nested cut-log validation inside material-items save surfaces cut-log and inventory errors via the original error classes, **not** re-wrapped:

- Cut-log row-level issues (arithmetic, status, parent-mismatch) → `CutLogExecutionError`.
- Inventory-row gating (`canAddCutLog`, stock-invariant) → `InventoryExecutionError` (`CUT_LOG_INVENTORY_NOT_IMPORTED`, `CUT_LOG_EXCEEDS_STARTING_BALANCE`).

Routes see a mix of error classes from a single use-case invocation and translate each to its typed HTTP response — consistent with the rest of the mutation lifecycle.
