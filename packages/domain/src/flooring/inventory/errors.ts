export type InventoryDomainErrorCode =
  | "INVENTORY_VALIDATION_FAILED"
  | "INVENTORY_LOCATION_WAREHOUSE_MISMATCH"
  | "INVENTORY_DELETE_BLOCKED"

export class InventoryDomainError extends Error {
  readonly code: InventoryDomainErrorCode

  constructor(code: InventoryDomainErrorCode, message: string) {
    super(message)
    this.name = "InventoryDomainError"
    this.code = code
  }
}
