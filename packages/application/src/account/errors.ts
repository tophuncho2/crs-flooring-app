export class TablePreferenceExecutionError extends Error {
  readonly code: string
  readonly status: number
  readonly field?: string

  constructor(input: {
    code: string
    message: string
    status: number
    field?: string
  }) {
    super(input.message)
    this.name = "TablePreferenceExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
  }
}

export function isTablePreferenceExecutionError(error: unknown): error is TablePreferenceExecutionError {
  return error instanceof TablePreferenceExecutionError
}
