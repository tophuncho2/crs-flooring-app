export type WorkOrderDomainErrorCode =
  | "WORK_ORDER_WAREHOUSE_LOCKED"
  | "WORK_ORDER_ITEM_INVALID_STATUS_TRANSITION"
  | "WORK_ORDER_CUT_LOG_WRITE_FAILED"
  | "WORK_ORDER_FILE_GENERATION_FAILED"

export class WorkOrderDomainError extends Error {
  readonly code: WorkOrderDomainErrorCode
  readonly detail?: Record<string, unknown>

  constructor(code: WorkOrderDomainErrorCode, detail?: Record<string, unknown>) {
    super(code)
    this.name = "WorkOrderDomainError"
    this.code = code
    this.detail = detail
  }
}
