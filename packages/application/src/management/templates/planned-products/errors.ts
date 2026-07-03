export type TemplatePlannedProductErrorCode =
  "TEMPLATE_PLANNED_PRODUCT_VALIDATION_FAILED"

export class TemplatePlannedProductExecutionError extends Error {
  readonly code: TemplatePlannedProductErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: TemplatePlannedProductErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "TemplatePlannedProductExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
