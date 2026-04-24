export type StagedInventoryDomainErrorCode =
  | "STAGED_VALIDATION_FAILED"
  | "STAGED_DIFF_VALIDATION_FAILED"
  | "STAGED_ROW_LOCKED_POST_IMPORT"
  | "STAGED_LOCATION_WAREHOUSE_MISMATCH"
  | "STAGED_IMPORT_WAREHOUSE_MISMATCH"

export class StagedInventoryDomainError extends Error {
  readonly code: StagedInventoryDomainErrorCode

  constructor(code: StagedInventoryDomainErrorCode, message: string) {
    super(message)
    this.name = "StagedInventoryDomainError"
    this.code = code
  }
}
