export type TemplatePlannedPaymentErrorCode =
  | "TEMPLATE_PLANNED_PAYMENT_VALIDATION_FAILED"
  | "TEMPLATE_PLANNED_PAYMENT_LINK_INVALID"

export class TemplatePlannedPaymentExecutionError extends Error {
  readonly code: TemplatePlannedPaymentErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: TemplatePlannedPaymentErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "TemplatePlannedPaymentExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
