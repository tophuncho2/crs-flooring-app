export type WarehouseErrorCode =
  | "WAREHOUSE_NOT_FOUND"
  | "WAREHOUSE_IN_USE"
  | "WAREHOUSE_NAME_CONFLICT"
  | "WAREHOUSE_NUMBER_CONFLICT"
  | "WAREHOUSE_VALIDATION_FAILED"
  | "SECTION_NOT_FOUND"
  | "SECTION_IN_USE"
  | "SECTION_BELONGS_TO_DIFFERENT_WAREHOUSE"
  | "LOCATION_NOT_FOUND"
  | "LOCATION_IN_USE"
  | "LOCATION_COORD_CONFLICT"
  | "LOCATION_VALIDATION_FAILED"

export class WarehouseExecutionError extends Error {
  readonly code: WarehouseErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: WarehouseErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "WarehouseExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
