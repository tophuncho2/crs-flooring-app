export type WorkOrderMaterialItemErrorCode =
  | "WORK_ORDER_MATERIAL_ITEM_VALIDATION_FAILED"
  | "WORK_ORDER_MATERIAL_ITEM_NOT_FOUND"

export class WorkOrderMaterialItemExecutionError extends Error {
  readonly code: WorkOrderMaterialItemErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: WorkOrderMaterialItemErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "WorkOrderMaterialItemExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
