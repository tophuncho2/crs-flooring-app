import { Prisma, createPaymentRecord, withDatabaseTransaction } from "@builders/db"
import { describePaymentFormIssues, validatePaymentForm } from "@builders/domain"
import { PaymentExecutionError } from "./errors.js"
import type { CreatePaymentUseCaseInput, PaymentUseCaseResult } from "./types.js"

export async function createPaymentUseCase(
  input: CreatePaymentUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<PaymentUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const issues = validatePaymentForm({
      amount: input.amount ?? "",
      direction: input.direction,
      paymentType: "",
      paymentMethod: "",
      paymentDate: "",
      memo: "",
    })
    if (issues.length > 0) {
      throw new PaymentExecutionError({
        code: "PAYMENT_VALIDATION_FAILED",
        message: describePaymentFormIssues(issues),
        status: 400,
        field: issues[0]?.code === "PAYMENT_DIRECTION_REQUIRED" ? "direction" : "amount",
      })
    }

    return await createPaymentRecord(input, c)
  })
}
