export type StagedInventoryDomainErrorCode =
  | "STAGED_VALIDATION_FAILED"
  | "STAGED_DIFF_VALIDATION_FAILED"
  | "STAGED_ROW_LOCKED_POST_IMPORT"
  | "STAGED_LOCATION_WAREHOUSE_MISMATCH"
  | "STAGED_IMPORT_WAREHOUSE_MISMATCH"
  | "STAGED_NOT_IMPORTABLE_ZERO_STOCK"
  | "STAGED_NOT_IMPORTABLE_MISSING_PRODUCT"
  | "STAGED_NOT_IMPORTABLE_MISSING_WAREHOUSE"

export class StagedInventoryDomainError extends Error {
  readonly code: StagedInventoryDomainErrorCode

  constructor(code: StagedInventoryDomainErrorCode, message: string) {
    super(message)
    this.name = "StagedInventoryDomainError"
    this.code = code
  }
}
