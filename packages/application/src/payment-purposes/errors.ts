export type PaymentPurposeErrorCode =
  | "PAYMENT_PURPOSE_VALIDATION_FAILED"
  | "PAYMENT_PURPOSE_NOT_FOUND"
  | "PAYMENT_PURPOSE_NAME_CONFLICT"

export class PaymentPurposeExecutionError extends Error {
  readonly code: PaymentPurposeErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: PaymentPurposeErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "PaymentPurposeExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
