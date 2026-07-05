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
// amount (required), direction, and optional date.
export type WriteTemplatePlannedPaymentInput = TemplatePlannedPaymentForm

// Money write boundary (money standard): amount is required — the canonical
// fixed-scale-2 string handed straight to Prisma (which coerces to Decimal).
function toMoney(value: string): string {
  return normalizeMoneyAmount(value)
}

// "" / whitespace = unset (stored NULL); otherwise coerced to a Date. Mirrors the
// payments `optionalDate` write boundary.
function optionalDate(value: string): Date | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
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
        paymentDate: optionalDate(draft.input.paymentDate),
        notes: draft.input.notes ? draft.input.notes : null,
        createdBy: input.actorEmail,
        updatedBy: input.actorEmail,
      })),
    })
  }

  for (const update of input.modified) {
    await tx.templatePlannedPayment.update({
      where: { id: update.id },
      data: {
        amount: toMoney(update.input.amount),
        direction: update.input.direction,
        paymentDate: optionalDate(update.input.paymentDate),
        notes: update.input.notes ? update.input.notes : null,
        updatedBy: input.actorEmail,
      },
    })
  }

  const plannedPayments = await listTemplatePlannedPayments(input.templateId, tx)
  return { plannedPayments, tempIdMap }
}
