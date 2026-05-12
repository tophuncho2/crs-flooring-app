export type WorkOrderCutLogErrorCode =
  | "WORK_ORDER_CUT_LOG_VALIDATION_FAILED"
  | "WORK_ORDER_CUT_LOG_NOT_FOUND"
  | "WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH"
  | "WORK_ORDER_CUT_LOG_VOID_NOT_ALLOWED"
  | "WORK_ORDER_CUT_LOG_DELETE_NOT_ALLOWED"
  | "WORK_ORDER_CUT_LOG_NOT_PENDING"
  | "WORK_ORDER_CUT_LOG_STALE"
  | "WORK_ORDER_CUT_LOG_FINALIZE_BLOCKED"

export class WorkOrderCutLogExecutionError extends Error {
  readonly code: WorkOrderCutLogErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: WorkOrderCutLogErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "WorkOrderCutLogExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
