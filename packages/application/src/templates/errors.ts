import { BaseExecutionError } from "../shared/execution-error.js"

export type TemplateErrorCode =
  | "TEMPLATE_VALIDATION_FAILED"
  | "TEMPLATE_NOT_FOUND"

export class TemplateExecutionError extends BaseExecutionError<TemplateErrorCode> {}
