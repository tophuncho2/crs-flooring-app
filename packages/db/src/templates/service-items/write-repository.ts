import type { Prisma } from "../../generated/prisma/client.js"
import { normalizeMoneyAmount, type TemplateServiceItemForm } from "@builders/domain"

// Wire-input shape for service-item writes. The user-supplied form carries the
// free-text itemType/itemName, the editable unit FK, and the manual money column
// (bidCost).
export type WriteTemplateServiceItemInput = TemplateServiceItemForm

// Quantity is optional: a blank string means "unset" (stored NULL); a non-blank
// string is handed straight to Prisma, which coerces it to Decimal.
function toDecimal(value: string): Prisma.Decimal | string | null {
  return value.trim() ? value : null
}

// "" / whitespace disconnects the unit (stored NULL); otherwise the FK id.
function toUnitId(value: string): string | null {
  return value.trim() ? value : null
}

// Money write boundary (money standard): blank → NULL, else normalize to the
// canonical fixed-scale-2 string before Prisma coerces it to Decimal(12,2).
function toMoney(value: string): string | null {
  return value.trim() ? normalizeMoneyAmount(value) : null
}

// Free-text column: blank → NULL, else the trimmed-but-preserved value.
function toText(value: string): string | null {
  return value.trim() ? value : null
}

export type ApplyTemplateServiceItemsDiffInput = {
  templateId: string
  // Actor email stamped on every written item: createdBy+updatedBy on added rows,
  // updatedBy on modified rows. A separate guarded param, never user input.
  actorEmail: string
  added: Array<{ id: string; tempId: string; input: WriteTemplateServiceItemInput }>
  modified: Array<{ id: string; input: WriteTemplateServiceItemInput }>
  deleted: Array<{ id: string }>
}

export type ApplyTemplateServiceItemsDiffResult = {
  tempIdMap: Record<string, string>
}

export async function applyTemplateServiceItemsDiff(
  tx: Prisma.TransactionClient,
  input: ApplyTemplateServiceItemsDiffInput,
): Promise<ApplyTemplateServiceItemsDiffResult> {
  if (input.deleted.length > 0) {
    await tx.templateServiceItem.deleteMany({
      where: { id: { in: input.deleted.map((d) => d.id) } },
    })
  }

  const tempIdMap: Record<string, string> = {}
  for (const draft of input.added) {
    tempIdMap[draft.tempId] = draft.id
  }

  if (input.added.length > 0) {
    await tx.templateServiceItem.createMany({
      data: input.added.map((draft) => ({
        id: draft.id,
        templateId: input.templateId,
        itemType: toText(draft.input.itemType),
        itemName: toText(draft.input.itemName),
        quantity: toDecimal(draft.input.quantity),
        unitId: toUnitId(draft.input.unitId),
        bidCost: toMoney(draft.input.bidCost),
        createdBy: input.actorEmail,
        updatedBy: input.actorEmail,
      })),
    })
  }

  for (const update of input.modified) {
    await tx.templateServiceItem.update({
      where: { id: update.id },
      data: {
        itemType: toText(update.input.itemType),
        itemName: toText(update.input.itemName),
        quantity: toDecimal(update.input.quantity),
        unitId: toUnitId(update.input.unitId),
        bidCost: toMoney(update.input.bidCost),
        updatedBy: input.actorEmail,
      },
    })
  }

  // The updated list is read on the pool by the use case after commit.
  return { tempIdMap }
}
