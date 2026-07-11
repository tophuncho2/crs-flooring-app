import { BaseExecutionError } from "../../shared/execution-error.js"

export type InventoryIndicatorExecutionErrorCode =
  | "INVENTORY_INDICATOR_VALIDATION_FAILED"
  | "INVENTORY_INDICATOR_NOT_FOUND"
  | "INVENTORY_INDICATOR_SCOPE_MISMATCH"
  | "INVENTORY_INDICATOR_STALE"
  | "INVENTORY_INDICATOR_DUPLICATE"
  | "INVENTORY_INDICATOR_PRODUCT_NOT_FOUND"
  | "INVENTORY_INDICATOR_WAREHOUSE_NOT_FOUND"
  | "INVENTORY_INDICATOR_UNIT_NOT_FOUND"

export class InventoryIndicatorExecutionError extends BaseExecutionError<InventoryIndicatorExecutionErrorCode> {}
