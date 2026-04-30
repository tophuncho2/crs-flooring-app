export type AuthErrorCode = "AUTH_USER_NOT_FOUND" | "AUTH_PASSWORD_ALREADY_SET"

export class AuthExecutionError extends Error {
  readonly code: AuthErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: AuthErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "AuthExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
