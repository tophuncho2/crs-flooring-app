import { BaseExecutionError } from "../../shared/execution-error.js"

export type WorkOrderPlannedPaymentErrorCode =
  | "WORK_ORDER_PLANNED_PAYMENT_VALIDATION_FAILED"
  | "WORK_ORDER_PLANNED_PAYMENT_LINK_INVALID"

export class WorkOrderPlannedPaymentExecutionError extends BaseExecutionError<WorkOrderPlannedPaymentErrorCode> {}
