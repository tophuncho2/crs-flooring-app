import { Prisma, createPaymentRecord, withDatabaseTransaction } from "@builders/db"
import { DEFAULT_PALETTE_COLOR, describePaymentFormIssues, validatePaymentForm } from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2003 } from "../shared/prisma-errors.js"
import { PaymentExecutionError } from "./errors.js"
import type { CreatePaymentUseCaseInput, PaymentUseCaseResult } from "./types.js"

export async function createPaymentUseCase(
  input: CreatePaymentUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<PaymentUseCaseResult> {
  assertActorEmail(actorEmail, "createPaymentUseCase")

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const issues = validatePaymentForm({
      amount: input.amount ?? "",
      direction: input.direction,
      // Color is metadata-only with no validation rule; pass the default purely to
      // satisfy the form shape. Create never persists it — new rows fall to the DB
      // default (SLATE) since `input` (CreatePaymentUseCaseInput) carries no color.
      color: DEFAULT_PALETTE_COLOR,
      // Free-text label with no validation rule; pass through to satisfy the form shape.
      paymentMethod: input.paymentMethod ?? "",
      // Phone with no validation rule (lenient policy); pass through to satisfy the form shape.
      storePhone: input.storePhone ?? "",
      // Free-text identifier with no validation rule; pass through to satisfy the form shape.
      receiptNumber: input.receiptNumber ?? "",
      // Free-text address with no validation rule; pass through to satisfy the form shape.
      storeAddress: input.storeAddress ?? "",
      // Free-text store number with no validation rule; pass through to satisfy the form shape.
      storeNumber: input.storeNumber ?? "",
      // Free-text internal notes with no validation rule; pass through to satisfy the form shape.
      internalNotes: input.internalNotes ?? "",
      paymentDate: "",
      entityId: input.entityId ?? null,
      workOrderId: input.workOrderId ?? null,
    })
    if (issues.length > 0) {
      throw new PaymentExecutionError({
        code: "PAYMENT_VALIDATION_FAILED",
        message: describePaymentFormIssues(issues),
        status: 400,
        field: issues[0]?.code === "PAYMENT_DIRECTION_REQUIRED" ? "direction" : "amount",
      })
    }

    try {
      return await createPaymentRecord(
        { ...input, createdBy: actorEmail, updatedBy: actorEmail },
        c,
      )
    } catch (error) {
      // A linked entity/work-order id that points at no row trips the FK (P2003).
      if (isP2003(error)) {
        throw new PaymentExecutionError({
          code: "PAYMENT_LINK_INVALID",
          message: "Linked work order or entity could not be found.",
          status: 400,
          field: "entityId",
        })
      }
      throw error
    }
  })
}
