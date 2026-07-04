export type PaymentDomainErrorCode = "PAYMENT_FORM_VALIDATION_FAILED"

export class PaymentDomainError extends Error {
  readonly code: PaymentDomainErrorCode
  readonly detail?: Record<string, unknown>

  constructor(code: PaymentDomainErrorCode, detail?: Record<string, unknown>) {
    super(code)
    this.name = "PaymentDomainError"
    this.code = code
    this.detail = detail
  }
}
