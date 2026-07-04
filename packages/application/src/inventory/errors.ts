export type InventoryErrorCode =
  | "INVENTORY_NOT_FOUND"
  | "INVENTORY_IN_USE"
  | "INVENTORY_VALIDATION_FAILED"
  | "INVENTORY_LOCATION_WAREHOUSE_MISMATCH"
  | "INVENTORY_LOCATION_NOT_FOUND"
  | "INVENTORY_PRODUCT_NOT_FOUND"
  | "INVENTORY_WAREHOUSE_NOT_FOUND"
  | "INVENTORY_UNIT_NOT_FOUND"

export class InventoryExecutionError extends Error {
  readonly code: InventoryErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: InventoryErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "InventoryExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
