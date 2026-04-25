export type StagedInventoryErrorCode =
  | "STAGED_VALIDATION_FAILED"
  | "STAGED_DIFF_VALIDATION_FAILED"
  | "STAGED_STALE_ROW_VERSION"
  | "STAGED_BATCH_INELIGIBLE"
  | "STAGED_BATCH_RACE"
  | "STAGED_MATERIALIZE_PRECONDITION_FAILED"
  | "STAGED_PARENT_NOT_FOUND"

export class StagedInventoryExecutionError extends Error {
  readonly code: StagedInventoryErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: StagedInventoryErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "StagedInventoryExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
