import { BaseExecutionError } from "../../shared/execution-error.js"

export type InventoryAdjustmentExecutionErrorCode =
  | "INVENTORY_ADJUSTMENT_VALIDATION_FAILED"
  | "INVENTORY_ADJUSTMENT_NOT_FOUND"
  | "INVENTORY_ADJUSTMENT_SCOPE_MISMATCH"
  | "INVENTORY_ADJUSTMENT_STALE"
  | "INVENTORY_ADJUSTMENT_EXCEEDS_INVENTORY"
  | "INVENTORY_ADJUSTMENT_WAREHOUSE_INVENTORY_MISMATCH"

export class InventoryAdjustmentExecutionError extends BaseExecutionError<InventoryAdjustmentExecutionErrorCode> {}
