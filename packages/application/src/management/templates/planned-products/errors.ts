export type TemplateMaterialItemErrorCode =
  "TEMPLATE_MATERIAL_ITEM_VALIDATION_FAILED"

export class TemplateMaterialItemExecutionError extends Error {
  readonly code: TemplateMaterialItemErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: TemplateMaterialItemErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "TemplateMaterialItemExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
