export type WorkOrderErrorCode =
  | "WORK_ORDER_VALIDATION_FAILED"
  | "WORK_ORDER_NOT_FOUND"
  | "WORK_ORDER_WAREHOUSE_LOCKED"
  | "WORK_ORDER_CUT_LOG_WRITE_FAILED"
  | "WORK_ORDER_FILE_GENERATION_FAILED"

export class WorkOrderExecutionError extends Error {
  readonly code: WorkOrderErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: WorkOrderErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "WorkOrderExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
