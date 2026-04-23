export type CutLogDomainErrorCode =
  | "CUT_LOG_INVALID_STATUS"
  | "CUT_LOG_ARITHMETIC_MISMATCH"
  | "CUT_LOG_INVENTORY_NOT_IMPORTED"
  | "CUT_LOG_EXCEEDS_STARTING_BALANCE"
  | "CUT_LOG_DELETE_NOT_MOST_RECENT"

export class CutLogDomainError extends Error {
  readonly code: CutLogDomainErrorCode
  readonly detail?: Record<string, unknown>

  constructor(code: CutLogDomainErrorCode, detail?: Record<string, unknown>) {
    super(code)
    this.name = "CutLogDomainError"
    this.code = code
    this.detail = detail
  }
}
