export type WorkOrderPlannedPaymentErrorCode =
  | "WORK_ORDER_PLANNED_PAYMENT_VALIDATION_FAILED"
  | "WORK_ORDER_PLANNED_PAYMENT_LINK_INVALID"

export class WorkOrderPlannedPaymentExecutionError extends Error {
  readonly code: WorkOrderPlannedPaymentErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: WorkOrderPlannedPaymentErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "WorkOrderPlannedPaymentExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
