export class WorkOrderAllocationExecutionError extends Error {
  readonly code: string
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: string
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "WorkOrderAllocationExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}

export function isWorkOrderAllocationExecutionError(
  error: unknown,
): error is WorkOrderAllocationExecutionError {
  return error instanceof WorkOrderAllocationExecutionError
}
