export type PropertyErrorCode =
  | "PROPERTY_VALIDATION_FAILED"
  | "PROPERTY_NAME_CONFLICT"
  | "PROPERTY_NOT_FOUND"
  | "PROPERTY_IN_USE"

export class PropertyExecutionError extends Error {
  readonly code: PropertyErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: PropertyErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "PropertyExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
