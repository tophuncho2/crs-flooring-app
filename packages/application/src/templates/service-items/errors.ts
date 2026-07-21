import { BaseExecutionError } from "../../shared/execution-error.js"

export type TemplateServiceItemErrorCode = "TEMPLATE_SERVICE_ITEM_VALIDATION_FAILED"

export class TemplateServiceItemExecutionError extends BaseExecutionError<TemplateServiceItemErrorCode> {}
