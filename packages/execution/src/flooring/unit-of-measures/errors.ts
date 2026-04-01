export class UnitOfMeasureExecutionError extends Error {
  readonly code: string
  readonly status: number
  readonly field?: string

  constructor(input: { code: string; message: string; status: number; field?: string }) {
    super(input.message)
    this.name = "UnitOfMeasureExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
  }
}
