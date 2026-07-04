export type UserErrorCode =
  | "USER_NOT_AUTHORIZED"
  | "USER_FORBIDDEN_RANK"
  | "USER_NOT_FOUND"
  | "USER_SELF_DELETE"
  | "USER_CONFLICT"
  | "USER_VALIDATION_FAILED"

export class UserExecutionError extends Error {
  readonly code: UserErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: UserErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "UserExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
