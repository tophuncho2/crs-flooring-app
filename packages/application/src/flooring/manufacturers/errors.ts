export type ManufacturerErrorCode =
  | "MANUFACTURER_NAME_CONFLICT"
  | "MANUFACTURER_NOT_FOUND"
  | "MANUFACTURER_VALIDATION_FAILED"

export class ManufacturerExecutionError extends Error {
  readonly code: ManufacturerErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: ManufacturerErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "ManufacturerExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
