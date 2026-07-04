export type ImportDomainErrorCode =
  | "IMPORT_VALIDATION_FAILED"
  | "IMPORT_DELETE_BLOCKED"
  | "IMPORT_WAREHOUSE_CHANGE_BLOCKED"

export class ImportDomainError extends Error {
  readonly code: ImportDomainErrorCode

  constructor(code: ImportDomainErrorCode, message: string) {
    super(message)
    this.name = "ImportDomainError"
    this.code = code
  }
}
