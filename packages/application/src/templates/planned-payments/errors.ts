import { BaseExecutionError } from "../../shared/execution-error.js"

export type TemplatePlannedPaymentErrorCode =
  | "TEMPLATE_PLANNED_PAYMENT_VALIDATION_FAILED"
  | "TEMPLATE_PLANNED_PAYMENT_LINK_INVALID"

export class TemplatePlannedPaymentExecutionError extends BaseExecutionError<TemplatePlannedPaymentErrorCode> {}
