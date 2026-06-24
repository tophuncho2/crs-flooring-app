export type PaymentErrorCode =
  | "PAYMENT_VALIDATION_FAILED"
  | "PAYMENT_NOT_FOUND"
  | "PAYMENT_LINK_INVALID"

export class PaymentExecutionError extends Error {
  readonly code: PaymentErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: PaymentErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "PaymentExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
