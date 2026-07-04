import { getPaymentById, getPaymentDetailById } from "@builders/db"
import { PAYMENT_NOT_FOUND_MESSAGE, type Payment, type PaymentDetail } from "@builders/domain"
import { PaymentExecutionError } from "./errors.js"

function notFound(): never {
  throw new PaymentExecutionError({
    code: "PAYMENT_NOT_FOUND",
    message: PAYMENT_NOT_FOUND_MESSAGE,
    status: 404,
  })
}

export async function getPaymentUseCase(id: string): Promise<Payment> {
  const payment = await getPaymentById(id)
  if (!payment) notFound()
  return payment
}

/**
 * Detail read for the record view: the payment plus its prev/next neighbors in
 * the global payment-number order, powering the record-view shell stepper.
 * Distinct from `getPaymentUseCase` so the cheaper neighbor-free read still
 * backs the `[id]` GET / conflict-snapshot paths.
 */
export async function getPaymentDetailUseCase(id: string): Promise<PaymentDetail> {
  const payment = await getPaymentDetailById(id, { withNeighbors: true })
  if (!payment) notFound()
  return payment
}
