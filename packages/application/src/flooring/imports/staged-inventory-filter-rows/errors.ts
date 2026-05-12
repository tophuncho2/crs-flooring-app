export type StagedInventoryFilterErrorCode =
  | "FILTER_VALIDATION_FAILED"
  | "FILTER_DIFF_VALIDATION_FAILED"
  | "FILTER_PARENT_NOT_FOUND"

export class StagedInventoryFilterExecutionError extends Error {
  readonly code: StagedInventoryFilterErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: StagedInventoryFilterErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "StagedInventoryFilterExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
