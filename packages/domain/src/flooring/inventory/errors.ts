export type InventoryDomainErrorCode =
  | "INVENTORY_VALIDATION_FAILED"
  | "INVENTORY_LOCATION_WAREHOUSE_MISMATCH"
  | "INVENTORY_DELETE_BLOCKED"
  | "INVENTORY_FIELD_NOT_EDITABLE"
  | "INVENTORY_OVERSOLD"
  | "INVENTORY_MERGE_TOO_FEW_SOURCES"
  | "INVENTORY_MERGE_CROSS_PRODUCT"
  | "INVENTORY_MERGE_ZERO_BALANCE_SOURCE"
  | "INVENTORY_MERGE_ALREADY_MERGED_SOURCE"

export class InventoryDomainError extends Error {
  readonly code: InventoryDomainErrorCode

  constructor(code: InventoryDomainErrorCode, message: string) {
    super(message)
    this.name = "InventoryDomainError"
    this.code = code
  }
}
