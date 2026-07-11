import { BaseExecutionError } from "../shared/execution-error.js"

export type PaymentPurposeErrorCode =
  | "PAYMENT_PURPOSE_VALIDATION_FAILED"
  | "PAYMENT_PURPOSE_NOT_FOUND"
  | "PAYMENT_PURPOSE_NAME_CONFLICT"

export class PaymentPurposeExecutionError extends BaseExecutionError<PaymentPurposeErrorCode> {}
