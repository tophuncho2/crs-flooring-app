import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeMoneyAmount,
  type TemplateInvoiceProductForm,
  type TemplateInvoiceProductRow,
} from "@builders/domain"
import { listTemplateInvoiceProducts } from "./read-repository.js"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

// Wire-input shape for invoice-product writes. Structural mirror of the planned
// product write input: the user-supplied form carries the editable `unitId` FK
// directly (seeded from the product on select, then freely editable). The
// item's `unitId` FK is authoritative.
export type WriteTemplateInvoiceProductInput = TemplateInvoiceProductForm

// Quantity is optional: a blank string means "unset" and is stored as
// NULL. A non-blank string is handed straight to Prisma, which coerces it
// to Decimal.
function toDecimal(value: string): Prisma.Decimal | string | null {
  return value.trim() ? value : null
}

// Money write boundary (money standard): blank → NULL, otherwise the canonical
// fixed-scale-2 string handed straight to Prisma (which coerces to Decimal).
function toMoney(value: string): string | null {
  return value.trim() ? normalizeMoneyAmount(value) : null
}

// "" / whitespace disconnects the unit (stored NULL); otherwise the FK id.
function toUnitId(value: string): string | null {
  return value.trim() ? value : null
}

export type ApplyTemplateInvoiceProductsDiffInput = {
  templateId: string
  // Actor email stamped on every written item: createdBy+updatedBy on added
  // rows, updatedBy on modified rows. A separate guarded param, never user
  // input — mirrors the parent template's create/update stamping.
  actorEmail: string
  added: Array<{ id: string; tempId: string; input: WriteTemplateInvoiceProductInput }>
  modified: Array<{ id: string; input: WriteTemplateInvoiceProductInput }>
  deleted: Array<{ id: string }>
}

export type ApplyTemplateInvoiceProductsDiffResult = {
  invoiceProducts: TemplateInvoiceProductRow[]
  tempIdMap: Record<string, string>
}

export async function applyTemplateInvoiceProductsDiff(
  tx: Prisma.TransactionClient,
  input: ApplyTemplateInvoiceProductsDiffInput,
): Promise<ApplyTemplateInvoiceProductsDiffResult> {
  if (input.deleted.length > 0) {
    await tx.templateInvoiceProduct.deleteMany({
      where: { id: { in: input.deleted.map((d) => d.id) } },
    })
  }

  const tempIdMap: Record<string, string> = {}
  for (const draft of input.added) {
    tempIdMap[draft.tempId] = draft.id
  }

  if (input.added.length > 0) {
    await tx.templateInvoiceProduct.createMany({
      data: input.added.map((draft) => ({
        id: draft.id,
        templateId: input.templateId,
        productId: draft.input.productId,
        quantity: toDecimal(draft.input.quantity),
        unitId: toUnitId(draft.input.unitId),
        notes: draft.input.notes ? draft.input.notes : null,
        cost: toMoney(draft.input.cost),
        createdBy: input.actorEmail,
        updatedBy: input.actorEmail,
      })),
    })
  }

  for (const update of input.modified) {
    await tx.templateInvoiceProduct.update({
      where: { id: update.id },
      data: {
        productId: update.input.productId,
        quantity: toDecimal(update.input.quantity),
        unitId: toUnitId(update.input.unitId),
        notes: update.input.notes ? update.input.notes : null,
        cost: toMoney(update.input.cost),
        updatedBy: input.actorEmail,
      },
    })
  }

  const invoiceProducts = await listTemplateInvoiceProducts(input.templateId, tx)
  return { invoiceProducts, tempIdMap }
}
