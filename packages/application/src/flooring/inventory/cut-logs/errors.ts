export type CutLogExecutionErrorCode =
  | "CUT_LOG_VALIDATION_FAILED"
  | "CUT_LOG_NOT_FOUND"
  | "CUT_LOG_SCOPE_MISMATCH"
  | "CUT_LOG_DELETE_NOT_ALLOWED"
  | "CUT_LOG_NOT_PENDING"
  | "CUT_LOG_STALE"
  | "CUT_LOG_FINALIZE_BLOCKED"
  | "CUT_LOG_EXCEEDS_INVENTORY"
  | "CUT_LOG_LINK_NOT_ALLOWED"
  | "CUT_LOG_LINK_SCOPE_MISMATCH"

/**
 * HTTP-shaped execution error thrown by every cut-log use case. Scope-
 * neutral — the same class serves WO routes and inv routes, with
 * `CUT_LOG_SCOPE_MISMATCH` covering the cross-scope guard the WO-only
 * world previously expressed as `WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH`.
 */
export class CutLogExecutionError extends Error {
  readonly code: CutLogExecutionErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: CutLogExecutionErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "CutLogExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
