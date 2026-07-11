import { BaseExecutionError } from "../shared/execution-error.js"

export type InviteErrorCode =
  | "INVITE_NOT_AUTHORIZED"
  | "INVITE_FORBIDDEN_RANK"
  | "INVITE_VALIDATION_FAILED"

export class InviteExecutionError extends BaseExecutionError<InviteErrorCode> {}
