import { BaseExecutionError } from "../shared/execution-error.js"

export type InventoryErrorCode =
  | "INVENTORY_NOT_FOUND"
  | "INVENTORY_IN_USE"
  | "INVENTORY_VALIDATION_FAILED"
  | "INVENTORY_LOCATION_WAREHOUSE_MISMATCH"
  | "INVENTORY_LOCATION_NOT_FOUND"
  | "INVENTORY_PRODUCT_NOT_FOUND"
  | "INVENTORY_WAREHOUSE_NOT_FOUND"
  | "INVENTORY_UNIT_NOT_FOUND"

export class InventoryExecutionError extends BaseExecutionError<InventoryErrorCode> {}
