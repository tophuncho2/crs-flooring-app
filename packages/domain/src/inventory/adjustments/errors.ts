export type InventoryAdjustmentDomainErrorCode =
  | "INVENTORY_ADJUSTMENT_ARITHMETIC_MISMATCH"
  | "INVENTORY_ADJUSTMENT_NET_DEDUCTED_EXCEEDS_STARTING_STOCK"
  | "INVENTORY_ADJUSTMENT_STALE_UPDATED_AT"
  | "INVENTORY_ADJUSTMENT_WAREHOUSE_INVENTORY_MISMATCH"

export class InventoryAdjustmentDomainError extends Error {
  readonly code: InventoryAdjustmentDomainErrorCode
  readonly detail?: Record<string, unknown>

  constructor(code: InventoryAdjustmentDomainErrorCode, detail?: Record<string, unknown>) {
    super(code)
    this.name = "InventoryAdjustmentDomainError"
    this.code = code
    this.detail = detail
  }
}
