export type InventoryAdjustmentExecutionErrorCode =
  | "INVENTORY_ADJUSTMENT_VALIDATION_FAILED"
  | "INVENTORY_ADJUSTMENT_NOT_FOUND"
  | "INVENTORY_ADJUSTMENT_SCOPE_MISMATCH"
  | "INVENTORY_ADJUSTMENT_STALE"
  | "INVENTORY_ADJUSTMENT_EXCEEDS_INVENTORY"
  | "INVENTORY_ADJUSTMENT_WAREHOUSE_INVENTORY_MISMATCH"

export class InventoryAdjustmentExecutionError extends Error {
  readonly code: InventoryAdjustmentExecutionErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: InventoryAdjustmentExecutionErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "InventoryAdjustmentExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
