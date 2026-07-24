import { BaseExecutionError } from "../../shared/execution-error.js"

export type TemplateCommissionErrorCode = "TEMPLATE_COMMISSION_VALIDATION_FAILED"

export class TemplateCommissionExecutionError extends BaseExecutionError<TemplateCommissionErrorCode> {}
