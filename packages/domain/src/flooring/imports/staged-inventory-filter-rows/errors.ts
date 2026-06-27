export type StagedInventoryFilterDomainErrorCode =
  | "FILTER_VALIDATION_FAILED"
  | "FILTER_DIFF_VALIDATION_FAILED"
  | "FILTER_DUPLICATE_PRODUCT"
  | "FILTER_UNKNOWN_PRODUCT"

export class StagedInventoryFilterDomainError extends Error {
  readonly code: StagedInventoryFilterDomainErrorCode

  constructor(code: StagedInventoryFilterDomainErrorCode, message: string) {
    super(message)
    this.name = "StagedInventoryFilterDomainError"
    this.code = code
  }
}
