export type InventoryIndicatorDomainErrorCode =
  | "INVENTORY_INDICATOR_STALE_UPDATED_AT"
  | "INVENTORY_INDICATOR_DUPLICATE_TRIPLE"
  | "INVENTORY_INDICATOR_CREATE_VALIDATION_FAILED"
  | "INVENTORY_INDICATOR_UPDATE_VALIDATION_FAILED"

export class InventoryIndicatorDomainError extends Error {
  readonly code: InventoryIndicatorDomainErrorCode
  readonly detail?: Record<string, unknown>

  constructor(code: InventoryIndicatorDomainErrorCode, detail?: Record<string, unknown>) {
    super(code)
    this.name = "InventoryIndicatorDomainError"
    this.code = code
    this.detail = detail
  }
}
