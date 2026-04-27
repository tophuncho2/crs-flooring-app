export type CutLogExecutionErrorCode =
  // Lookups
  | "CUT_LOG_PARENT_NOT_FOUND"
  | "CUT_LOG_NOT_FOUND"
  // Validation failures (4xx)
  // (`CUT_LOG_VALIDATION_FAILED` is the route-edge body-shape error;
  // `CUT_LOG_DIFF_VALIDATION_FAILED` is reserved for diff-shape failures
  // — both added in sweep 6 to mirror staged-inv's
  // `STAGED_VALIDATION_FAILED` / `STAGED_DIFF_VALIDATION_FAILED` pair.)
  | "CUT_LOG_VALIDATION_FAILED"
  | "CUT_LOG_DIFF_VALIDATION_FAILED"
  | "CUT_LOG_BATCH_INELIGIBLE"
  | "CUT_LOG_VOID_NOT_ALLOWED"
  | "CUT_LOG_LINK_VALIDATION_FAILED"
  | "CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK"
  // Race / drift conditions (4xx, retryable)
  | "CUT_LOG_STALE_ROW_VERSION"
  | "CUT_LOG_BATCH_RACE"
  | "CUT_LOG_PRECONDITION_FAILED"

/**
 * Mirrors `StagedInventoryExecutionError`. The `status` field is an HTTP
 * hint stored on the error so the route translator (sweep 5) can surface
 * the right status code without re-classifying. Per
 * `packages/application/CLAUDE.md` rule 2 the application layer doesn't
 * import HTTP types — `status` is just a number.
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
