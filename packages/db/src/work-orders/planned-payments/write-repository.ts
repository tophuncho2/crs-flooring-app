import type { Prisma } from "../../generated/prisma/client.js"
import {
  normalizeMoneyAmount,
  type WorkOrderPlannedPaymentForm,
} from "@builders/domain"

// Wire-input shape for planned-payment writes. The user-supplied form carries the
// amount (required) and direction.
export type WriteWorkOrderPlannedPaymentInput = WorkOrderPlannedPaymentForm

// Money write boundary (money standard): amount is required — the canonical
// fixed-scale-2 string handed straight to Prisma (which coerces to Decimal).
function toMoney(value: string): string {
  return normalizeMoneyAmount(value)
}

export type ApplyWorkOrderPlannedPaymentsDiffInput = {
  workOrderId: string
  // Actor email stamped on every written item: createdBy+updatedBy on added rows,
  // updatedBy on modified rows. A separate guarded param, never user input.
  actorEmail: string
  added: Array<{ id: string; tempId: string; input: WriteWorkOrderPlannedPaymentInput }>
  modified: Array<{ id: string; input: WriteWorkOrderPlannedPaymentInput }>
  deleted: Array<{ id: string }>
}

export type ApplyWorkOrderPlannedPaymentsDiffResult = {
  tempIdMap: Record<string, string>
}

export async function applyWorkOrderPlannedPaymentsDiff(
  tx: Prisma.TransactionClient,
  input: ApplyWorkOrderPlannedPaymentsDiffInput,
): Promise<ApplyWorkOrderPlannedPaymentsDiffResult> {
  if (input.deleted.length > 0) {
    await tx.flooringWorkOrderPlannedPayment.deleteMany({
      where: { id: { in: input.deleted.map((d) => d.id) } },
    })
  }

  const tempIdMap: Record<string, string> = {}
  for (const draft of input.added) {
    tempIdMap[draft.tempId] = draft.id
  }

  if (input.added.length > 0) {
    await tx.flooringWorkOrderPlannedPayment.createMany({
      data: input.added.map((draft) => ({
        id: draft.id,
        workOrderId: input.workOrderId,
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
    const data: Prisma.FlooringWorkOrderPlannedPaymentUncheckedUpdateInput = {
      amount: toMoney(update.input.amount),
      direction: update.input.direction,
      notes: update.input.notes ? update.input.notes : null,
      entityId: update.input.entityId,
      paymentPurposeId: update.input.paymentPurposeId,
      updatedBy: input.actorEmail,
    }
    await tx.flooringWorkOrderPlannedPayment.update({ where: { id: update.id }, data })
  }

  // The updated list is read on the pool by the use case after commit.
  return { tempIdMap }
}
