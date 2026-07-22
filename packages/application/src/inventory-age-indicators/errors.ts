import { BaseExecutionError } from "../shared/execution-error.js"

export type InventoryAgeIndicatorErrorCode =
  | "INVENTORY_AGE_INDICATOR_VALIDATION_FAILED"
  | "INVENTORY_AGE_INDICATOR_NOT_FOUND"
  | "INVENTORY_AGE_INDICATOR_DAYS_CONFLICT"

export class InventoryAgeIndicatorExecutionError extends BaseExecutionError<InventoryAgeIndicatorErrorCode> {}
