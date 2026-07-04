export type TemplateErrorCode =
  | "TEMPLATE_VALIDATION_FAILED"
  | "TEMPLATE_NOT_FOUND"

export class TemplateExecutionError extends Error {
  readonly code: TemplateErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: TemplateErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "TemplateExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
