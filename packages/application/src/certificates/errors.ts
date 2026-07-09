export type CertificateErrorCode = "CERTIFICATE_VALIDATION_FAILED" | "CERTIFICATE_NOT_FOUND"

export class CertificateExecutionError extends Error {
  readonly code: CertificateErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: CertificateErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "CertificateExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
