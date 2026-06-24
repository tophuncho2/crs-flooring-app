export type EntityTypeErrorCode = "ENTITY_TYPE_VALIDATION_FAILED" | "ENTITY_TYPE_NOT_FOUND"

export class EntityTypeExecutionError extends Error {
  readonly code: EntityTypeErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: EntityTypeErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "EntityTypeExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
