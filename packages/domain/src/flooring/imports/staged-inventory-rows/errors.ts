export type StagedInventoryDomainErrorCode =
  | "STAGED_VALIDATION_FAILED"
  | "STAGED_ROW_LOCKED_POST_IMPORT"
  | "STAGED_LOCATION_WAREHOUSE_MISMATCH"
  | "STAGED_IMPORT_WAREHOUSE_MISMATCH"
  | "STAGED_NOT_IMPORTABLE_ZERO_STOCK"
  | "STAGED_NOT_IMPORTABLE_MISSING_PRODUCT"
  | "STAGED_NOT_IMPORTABLE_MISSING_WAREHOUSE"
  // Status-aware codes — per-row update / delete + import-batch use
  // cases throw these.
  | "STAGED_ROW_NOT_DRAFT"
  | "STAGED_ROW_ALREADY_QUEUED"
  | "STAGED_ROW_BATCH_INELIGIBLE"

export class StagedInventoryDomainError extends Error {
  readonly code: StagedInventoryDomainErrorCode

  constructor(code: StagedInventoryDomainErrorCode, message: string) {
    super(message)
    this.name = "StagedInventoryDomainError"
    this.code = code
  }
}
