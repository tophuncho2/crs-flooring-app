export type WorkOrderFileErrorCode =
  | "WORK_ORDER_FILE_NOT_FOUND"
  | "WORK_ORDER_FILE_GENERATION_FAILED"
  | "WORK_ORDER_FILE_DELETE_FAILED"
  | "WORK_ORDER_FILE_INVALID_STATE"

export class WorkOrderFileExecutionError extends Error {
  readonly code: WorkOrderFileErrorCode
  readonly status: number
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: WorkOrderFileErrorCode
    message: string
    status: number
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "WorkOrderFileExecutionError"
    this.code = input.code
    this.status = input.status
    this.payload = input.payload
  }
}
