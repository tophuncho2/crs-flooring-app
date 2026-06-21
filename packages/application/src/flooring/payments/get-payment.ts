import { getPaymentById } from "@builders/db"
import { PAYMENT_NOT_FOUND_MESSAGE, type Payment } from "@builders/domain"
import { PaymentExecutionError } from "./errors.js"

export async function getPaymentUseCase(id: string): Promise<Payment> {
  const payment = await getPaymentById(id)
  if (!payment) {
    throw new PaymentExecutionError({
      code: "PAYMENT_NOT_FOUND",
      message: PAYMENT_NOT_FOUND_MESSAGE,
      status: 404,
    })
  }
  return payment
}
