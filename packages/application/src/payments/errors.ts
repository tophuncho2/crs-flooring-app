import { BaseExecutionError } from "../shared/execution-error.js"

export type PaymentErrorCode =
  | "PAYMENT_VALIDATION_FAILED"
  | "PAYMENT_NOT_FOUND"
  | "PAYMENT_LINK_INVALID"

export class PaymentExecutionError extends BaseExecutionError<PaymentErrorCode> {}
