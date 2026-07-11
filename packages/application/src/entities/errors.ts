import { BaseExecutionError } from "../shared/execution-error.js"

export type EntityErrorCode =
  | "ENTITY_VALIDATION_FAILED"
  | "ENTITY_NOT_FOUND"
  | "ENTITY_INVALID_TYPE"

export class EntityExecutionError extends BaseExecutionError<EntityErrorCode> {}
