export type ServiceErrorCode =
  | "SERVICE_VALIDATION_FAILED"
  | "SERVICE_NOT_FOUND"
  | "SERVICE_IN_USE"

export class ServiceExecutionError extends Error {
  readonly code: ServiceErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: ServiceErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "ServiceExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
