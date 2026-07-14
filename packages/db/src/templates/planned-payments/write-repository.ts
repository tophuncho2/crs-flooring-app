import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeMoneyAmount,
  type TemplatePlannedPaymentForm,
  type TemplatePlannedPaymentRow,
} from "@builders/domain"
import { listTemplatePlannedPayments } from "./read-repository.js"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

// Wire-input shape for planned-payment writes. The user-supplied form carries the
// amount (required) and direction.
export type WriteTemplatePlannedPaymentInput = TemplatePlannedPaymentForm

// Money write boundary (money standard): amount is required — the canonical
// fixed-scale-2 string handed straight to Prisma (which coerces to Decimal).
function toMoney(value: string): string {
  return normalizeMoneyAmount(value)
}

export type ApplyTemplatePlannedPaymentsDiffInput = {
  templateId: string
  // Actor email stamped on every written item: createdBy+updatedBy on added rows,
  // updatedBy on modified rows. A separate guarded param, never user input.
  actorEmail: string
  added: Array<{ id: string; tempId: string; input: WriteTemplatePlannedPaymentInput }>
  modified: Array<{ id: string; input: WriteTemplatePlannedPaymentInput }>
  deleted: Array<{ id: string }>
}

export type ApplyTemplatePlannedPaymentsDiffResult = {
  plannedPayments: TemplatePlannedPaymentRow[]
  tempIdMap: Record<string, string>
}

export async function applyTemplatePlannedPaymentsDiff(
  tx: Prisma.TransactionClient,
  input: ApplyTemplatePlannedPaymentsDiffInput,
): Promise<ApplyTemplatePlannedPaymentsDiffResult> {
  if (input.deleted.length > 0) {
    await tx.templatePlannedPayment.deleteMany({
      where: { id: { in: input.deleted.map((d) => d.id) } },
    })
  }

  const tempIdMap: Record<string, string> = {}
  for (const draft of input.added) {
    tempIdMap[draft.tempId] = draft.id
  }

  if (input.added.length > 0) {
    await tx.templatePlannedPayment.createMany({
      data: input.added.map((draft) => ({
        id: draft.id,
        templateId: input.templateId,
        amount: toMoney(draft.input.amount),
        direction: draft.input.direction,
        notes: draft.input.notes ? draft.input.notes : null,
        // Optional entity link — scalar FK on the unchecked createMany input
        // (null = unlinked). The form always carries entityId, so no tri-state.
        entityId: draft.input.entityId,
        // Optional payment-purpose link — same scalar-FK treatment.
        paymentPurposeId: draft.input.paymentPurposeId,
        createdBy: input.actorEmail,
        updatedBy: input.actorEmail,
      })),
    })
  }

  for (const update of input.modified) {
    // Unchecked update input so the scalar entityId FK is assignable directly
    // (mirrors the payments write repo). The form always carries entityId.
    const data: Prisma.TemplatePlannedPaymentUncheckedUpdateInput = {
      amount: toMoney(update.input.amount),
      direction: update.input.direction,
      notes: update.input.notes ? update.input.notes : null,
      entityId: update.input.entityId,
      paymentPurposeId: update.input.paymentPurposeId,
      updatedBy: input.actorEmail,
    }
    await tx.templatePlannedPayment.update({ where: { id: update.id }, data })
  }

  const plannedPayments = await listTemplatePlannedPayments(input.templateId, tx)
  return { plannedPayments, tempIdMap }
}
