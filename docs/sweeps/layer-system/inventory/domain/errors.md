# Inventory Domain — Errors

## `InventoryExecutionError`
Typed error class under `packages/domain/src/flooring/inventory/errors.ts`.

```ts
class InventoryExecutionError extends Error {
  readonly code: InventoryExecutionErrorCode
  readonly status: number
  readonly message: string
  readonly detail?: string
  readonly issues?: InventoryValidationIssue[]  // for INVENTORY_VALIDATION_FAILED
}
```

## Code union

```ts
export type InventoryExecutionErrorCode =
  | "INVENTORY_NOT_FOUND"                   // 404
  | "INVENTORY_VALIDATION_FAILED"           // 400 — diff or form validator rejected
  | "INVENTORY_IN_USE"                      // 409 — delete blocked by cut-log presence
  | "INVENTORY_LOCATION_WAREHOUSE_MISMATCH" // 400 — location/warehouse pair inconsistent
  | "INVENTORY_WAREHOUSE_NOT_FOUND"         // 400 — FK miss on warehouseId
  | "INVENTORY_LOCATION_NOT_FOUND"          // 400 — FK miss on locationId
  | "INVENTORY_UPDATE_CONFLICT"             // 409 — expectedUpdatedAt mismatch
  | "CUT_LOG_INVENTORY_NOT_IMPORTED"        // 409 — canAddCutLog gate failed
  | "CUT_LOG_EXCEEDS_STARTING_BALANCE"      // 409 — computeStockAvailable would go negative
```

## Cross-module error sharing

`CUT_LOG_INVENTORY_NOT_IMPORTED` and `CUT_LOG_EXCEEDS_STARTING_BALANCE` live here (not in the cut-logs domain) because:
1. `canAddCutLog` is an inventory-row rule (`inventory.isImported === true`).
2. `computeStockAvailable` invariants are about the inventory row's starting balance.

Both parent paths (`saveInventoryCutLogsUseCase`, `saveWorkOrderMaterialItemsUseCase`) throw from this module's error class — cut-logs' own `CutLogExecutionError` handles arithmetic and structural issues internal to the cut-log row itself (`before − cut === after`, status enum).
