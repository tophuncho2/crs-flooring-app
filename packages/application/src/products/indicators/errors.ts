export type InventoryIndicatorExecutionErrorCode =
  | "INVENTORY_INDICATOR_VALIDATION_FAILED"
  | "INVENTORY_INDICATOR_NOT_FOUND"
  | "INVENTORY_INDICATOR_SCOPE_MISMATCH"
  | "INVENTORY_INDICATOR_STALE"
  | "INVENTORY_INDICATOR_DUPLICATE"
  | "INVENTORY_INDICATOR_PRODUCT_NOT_FOUND"
  | "INVENTORY_INDICATOR_WAREHOUSE_NOT_FOUND"
  | "INVENTORY_INDICATOR_UNIT_NOT_FOUND"

export class InventoryIndicatorExecutionError extends Error {
  readonly code: InventoryIndicatorExecutionErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: InventoryIndicatorExecutionErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "InventoryIndicatorExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
