export type JobTypeErrorCode =
  | "JOB_TYPE_VALIDATION_FAILED"
  | "JOB_TYPE_NOT_FOUND"
  | "JOB_TYPE_NAME_CONFLICT"

export class JobTypeExecutionError extends Error {
  readonly code: JobTypeErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: JobTypeErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "JobTypeExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
