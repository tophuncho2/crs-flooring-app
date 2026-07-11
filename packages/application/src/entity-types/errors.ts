import { BaseExecutionError } from "../shared/execution-error.js"

export type EntityTypeErrorCode = "ENTITY_TYPE_VALIDATION_FAILED" | "ENTITY_TYPE_NOT_FOUND"

export class EntityTypeExecutionError extends BaseExecutionError<EntityTypeErrorCode> {}
