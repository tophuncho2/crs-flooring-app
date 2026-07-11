import { BaseExecutionError } from "../shared/execution-error.js"

export type UserErrorCode =
  | "USER_NOT_AUTHORIZED"
  | "USER_FORBIDDEN_RANK"
  | "USER_NOT_FOUND"
  | "USER_SELF_DELETE"
  | "USER_CONFLICT"
  | "USER_VALIDATION_FAILED"

export class UserExecutionError extends BaseExecutionError<UserErrorCode> {}
