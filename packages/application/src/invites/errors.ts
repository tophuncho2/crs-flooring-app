export type InviteErrorCode =
  | "INVITE_NOT_AUTHORIZED"
  | "INVITE_FORBIDDEN_RANK"
  | "INVITE_VALIDATION_FAILED"

export class InviteExecutionError extends Error {
  readonly code: InviteErrorCode
  readonly status: number
  readonly field?: string

  constructor(input: { code: InviteErrorCode; message: string; status: number; field?: string }) {
    super(input.message)
    this.name = "InviteExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
  }
}
