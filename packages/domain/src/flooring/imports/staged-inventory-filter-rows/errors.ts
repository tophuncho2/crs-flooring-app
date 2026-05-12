export type StagedInventoryFilterDomainErrorCode =
  | "FILTER_VALIDATION_FAILED"
  | "FILTER_DIFF_VALIDATION_FAILED"
  | "FILTER_DUPLICATE_PRODUCT"
  | "FILTER_PRODUCT_LOCKED_WITH_CHILDREN"
  | "FILTER_DELETE_BLOCKED_BY_CHILDREN"
  | "FILTER_UNKNOWN_PRODUCT"

export class StagedInventoryFilterDomainError extends Error {
  readonly code: StagedInventoryFilterDomainErrorCode

  constructor(code: StagedInventoryFilterDomainErrorCode, message: string) {
    super(message)
    this.name = "StagedInventoryFilterDomainError"
    this.code = code
  }
}
