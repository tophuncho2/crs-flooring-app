import { BaseExecutionError } from "../shared/execution-error.js"

export type WorkOrderErrorCode =
  | "WORK_ORDER_VALIDATION_FAILED"
  | "WORK_ORDER_NOT_FOUND"
  | "WORK_ORDER_INVENTORY_ADJUSTMENT_WRITE_FAILED"
  | "TEMPLATE_SYNC_TEMPLATE_NOT_FOUND"
  | "TEMPLATE_SYNC_TEMPLATE_INVALID"

export class WorkOrderExecutionError extends BaseExecutionError<WorkOrderErrorCode> {}
