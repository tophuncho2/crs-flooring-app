import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import type { TemplatePlannedProductForm } from "@builders/domain"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

// Wire-input shape for planned-product writes (UoM epic 2C). The user-supplied
// form now carries the editable `unitId` FK directly — the application layer
// resolves it (form value, else the product's own unit as a seed fallback)
// before calling here. The frozen `sendUnit*` snapshot is no longer written;
// the item's `unitId` FK is authoritative.
export type WriteTemplatePlannedProductInput = TemplatePlannedProductForm

// Quantity is optional: a blank string means "unset" and is stored as
// NULL. A non-blank string is handed straight to Prisma, which coerces it
// to Decimal.
function toDecimal(value: string): Prisma.Decimal | string | null {
  return value.trim() ? value : null
}

// "" / whitespace disconnects the unit (stored NULL); otherwise the FK id.
function toUnitId(value: string): string | null {
  return value.trim() ? value : null
}

export type ApplyTemplatePlannedProductsDiffInput = {
  templateId: string
  // Actor email stamped on every written item: createdBy+updatedBy on added
  // rows, updatedBy on modified rows. A separate guarded param, never user
  // input — mirrors the parent template's create/update stamping.
  actorEmail: string
  added: Array<{ id: string; tempId: string; input: WriteTemplatePlannedProductInput }>
  modified: Array<{ id: string; input: WriteTemplatePlannedProductInput }>
  deleted: Array<{ id: string }>
}

export type ApplyTemplatePlannedProductsDiffResult = {
  tempIdMap: Record<string, string>
}

export async function applyTemplatePlannedProductsDiff(
  tx: Prisma.TransactionClient,
  input: ApplyTemplatePlannedProductsDiffInput,
): Promise<ApplyTemplatePlannedProductsDiffResult> {
  if (input.deleted.length > 0) {
    await tx.templatePlannedProduct.deleteMany({
      where: { id: { in: input.deleted.map((d) => d.id) } },
    })
  }

  const tempIdMap: Record<string, string> = {}
  for (const draft of input.added) {
    tempIdMap[draft.tempId] = draft.id
  }

  if (input.added.length > 0) {
    await tx.templatePlannedProduct.createMany({
      data: input.added.map((draft) => ({
        id: draft.id,
        templateId: input.templateId,
        productId: draft.input.productId,
        quantity: toDecimal(draft.input.quantity),
        unitId: toUnitId(draft.input.unitId),
        notes: draft.input.notes ? draft.input.notes : null,
        createdBy: input.actorEmail,
        updatedBy: input.actorEmail,
      })),
    })
  }

  for (const update of input.modified) {
    await tx.templatePlannedProduct.update({
      where: { id: update.id },
      data: {
        productId: update.input.productId,
        quantity: toDecimal(update.input.quantity),
        unitId: toUnitId(update.input.unitId),
        notes: update.input.notes ? update.input.notes : null,
        updatedBy: input.actorEmail,
      },
    })
  }

  // The updated list is read on the pool by the use case after commit — a
  // relation-rich read here would fire concurrent sub-queries on the pinned tx.
  return { tempIdMap }
}
