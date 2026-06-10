export type ContactErrorCode =
  | "CONTACT_VALIDATION_FAILED"
  | "CONTACT_NOT_FOUND"

export class ContactExecutionError extends Error {
  readonly code: ContactErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: ContactErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "ContactExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
