export type ImportStagedInventorySectionErrorCode =
  | "SECTION_PARENT_NOT_FOUND"
  | "SECTION_FILTER_VALIDATION_FAILED"
  | "SECTION_FILTER_DIFF_VALIDATION_FAILED"
  | "SECTION_UNIT_VALIDATION_FAILED"
  | "SECTION_ROW_VALIDATION_FAILED"
  | "SECTION_ROW_DIFF_VALIDATION_FAILED"

export class ImportStagedInventorySectionExecutionError extends Error {
  readonly code: ImportStagedInventorySectionErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: ImportStagedInventorySectionErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "ImportStagedInventorySectionExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
