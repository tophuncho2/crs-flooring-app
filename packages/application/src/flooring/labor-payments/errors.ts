export type LaborPaymentErrorCode =
  | "LABOR_PAYMENT_VALIDATION_FAILED"
  | "LABOR_PAYMENT_NOT_FOUND"
  | "LABOR_PAYMENT_CONTACT_NOT_FOUND"

export class LaborPaymentExecutionError extends Error {
  readonly code: LaborPaymentErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: LaborPaymentErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "LaborPaymentExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
