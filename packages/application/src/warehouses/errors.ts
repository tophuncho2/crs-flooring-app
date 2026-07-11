import { BaseExecutionError } from "../shared/execution-error.js"

export type WarehouseErrorCode =
  | "WAREHOUSE_NOT_FOUND"
  | "WAREHOUSE_IN_USE"
  | "WAREHOUSE_NAME_CONFLICT"
  | "WAREHOUSE_VALIDATION_FAILED"

export class WarehouseExecutionError extends BaseExecutionError<WarehouseErrorCode> {}
