export type ImportErrorCode =
  | "IMPORT_VALIDATION_FAILED"
  | "IMPORT_NOT_FOUND"
  | "IMPORT_WAREHOUSE_NOT_FOUND"
  | "IMPORT_DELETE_BLOCKED_BY_INVENTORY"
  | "IMPORT_WAREHOUSE_CHANGE_BLOCKED_BY_INVENTORY"

export class ImportExecutionError extends Error {
  readonly code: ImportErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: ImportErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "ImportExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
