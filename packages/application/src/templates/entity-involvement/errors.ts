import { BaseExecutionError } from "../../shared/execution-error.js"

export type TemplateEntityInvolvementErrorCode =
  | "TEMPLATE_ENTITY_INVOLVEMENT_VALIDATION_FAILED"
  | "TEMPLATE_ENTITY_INVOLVEMENT_LINK_INVALID"

export class TemplateEntityInvolvementExecutionError extends BaseExecutionError<TemplateEntityInvolvementErrorCode> {}
