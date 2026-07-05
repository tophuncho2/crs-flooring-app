import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeMoneyAmount,
  type TemplateInvoiceItemForm,
  type TemplateInvoiceItemRow,
} from "@builders/domain"
import { listTemplateInvoiceItems } from "./read-repository.js"

// Wire-input shape for invoice-item writes. The user-supplied form carries the
// amount (required), direction, and notes — no date, no entity link.
export type WriteTemplateInvoiceItemInput = TemplateInvoiceItemForm

// Money write boundary (money standard): amount is required — the canonical
// fixed-scale-2 string handed straight to Prisma (which coerces to Decimal).
function toMoney(value: string): string {
  return normalizeMoneyAmount(value)
}

export type ApplyTemplateInvoiceItemsDiffInput = {
  templateId: string
  // Actor email stamped on every written item: createdBy+updatedBy on added rows,
  // updatedBy on modified rows. A separate guarded param, never user input.
  actorEmail: string
  added: Array<{ id: string; tempId: string; input: WriteTemplateInvoiceItemInput }>
  modified: Array<{ id: string; input: WriteTemplateInvoiceItemInput }>
  deleted: Array<{ id: string }>
}

export type ApplyTemplateInvoiceItemsDiffResult = {
  invoiceItems: TemplateInvoiceItemRow[]
  tempIdMap: Record<string, string>
}

export async function applyTemplateInvoiceItemsDiff(
  tx: Prisma.TransactionClient,
  input: ApplyTemplateInvoiceItemsDiffInput,
): Promise<ApplyTemplateInvoiceItemsDiffResult> {
  if (input.deleted.length > 0) {
    await tx.templateInvoiceItem.deleteMany({
      where: { id: { in: input.deleted.map((d) => d.id) } },
    })
  }

  const tempIdMap: Record<string, string> = {}
  for (const draft of input.added) {
    tempIdMap[draft.tempId] = draft.id
  }

  if (input.added.length > 0) {
    await tx.templateInvoiceItem.createMany({
      data: input.added.map((draft) => ({
        id: draft.id,
        templateId: input.templateId,
        amount: toMoney(draft.input.amount),
        direction: draft.input.direction,
        notes: draft.input.notes ? draft.input.notes : null,
        createdBy: input.actorEmail,
        updatedBy: input.actorEmail,
      })),
    })
  }

  for (const update of input.modified) {
    const data: Prisma.TemplateInvoiceItemUncheckedUpdateInput = {
      amount: toMoney(update.input.amount),
      direction: update.input.direction,
      notes: update.input.notes ? update.input.notes : null,
      updatedBy: input.actorEmail,
    }
    await tx.templateInvoiceItem.update({ where: { id: update.id }, data })
  }

  const invoiceItems = await listTemplateInvoiceItems(input.templateId, tx)
  return { invoiceItems, tempIdMap }
}
