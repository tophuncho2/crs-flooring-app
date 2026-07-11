import { BaseExecutionError } from "../shared/execution-error.js"

export type PropertyErrorCode =
  | "PROPERTY_VALIDATION_FAILED"
  | "PROPERTY_NOT_FOUND"
  | "PROPERTY_IN_USE"

export class PropertyExecutionError extends BaseExecutionError<PropertyErrorCode> {}
