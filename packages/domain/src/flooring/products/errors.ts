export type ProductErrorCode =
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_IN_USE"
  | "PRODUCT_NAME_CONFLICT"
  | "PRODUCT_VALIDATION_FAILED"
  | "PRODUCT_CATEGORY_NOT_FOUND"
  | "PRODUCT_MANUFACTURER_NOT_FOUND"
  | "PRODUCT_COVERAGE_PER_UNIT_REQUIRED"
  | "PRODUCT_COVERAGE_PER_UNIT_NOT_ALLOWED"
  | "PRODUCT_COVERAGE_PER_UNIT_LOCKED"

export class ProductExecutionError extends Error {
  readonly code: ProductErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: ProductErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "ProductExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
