export type CutLogDomainErrorCode =
  // Pre-existing codes (sweep-2 keeps these in place — callers may still throw them)
  | "CUT_LOG_ARITHMETIC_MISMATCH"
  | "CUT_LOG_INVENTORY_NOT_IMPORTED"
  | "CUT_LOG_EXCEEDS_STARTING_BALANCE"
  | "CUT_LOG_DELETE_NOT_MOST_RECENT"
  | "CUT_LOG_INVALID_TRANSITION"
  | "CUT_LOG_LINKAGE_ASYMMETRY"
  | "CUT_LOG_VOID_STATUS_MISMATCH"
  | "CUT_LOG_FINALIZE_DIRTY_BLOCKED"
  | "CUT_LOG_PENDING_INPUT_NOT_ALLOWED"
  // Sweep-2 additions for the worker-driven flows (pending-save / finalize /
  // void) and the totalCutSum invariant.
  | "CUT_LOG_BATCH_INELIGIBLE"
  | "CUT_LOG_PENDING_SAVE_VALIDATION_FAILED"
  | "CUT_LOG_VOID_NOT_ALLOWED"
  | "CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK"
  | "CUT_LOG_FINAL_SEQUENCE_INVALID"
  | "CUT_LOG_LINK_UPDATE_BLOCKED"
  // Sync per-row mutation flow (create / update / delete pending cut log)
  | "CUT_LOG_STALE_UPDATED_AT"

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
