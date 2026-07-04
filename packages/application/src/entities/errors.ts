export type EntityErrorCode =
  | "ENTITY_VALIDATION_FAILED"
  | "ENTITY_NOT_FOUND"
  | "ENTITY_INVALID_TYPE"

export class EntityExecutionError extends Error {
  readonly code: EntityErrorCode
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>

  constructor(input: {
    code: EntityErrorCode
    message: string
    status: number
    field?: string
    payload?: Record<string, unknown>
  }) {
    super(input.message)
    this.name = "EntityExecutionError"
    this.code = input.code
    this.status = input.status
    this.field = input.field
    this.payload = input.payload
  }
}
