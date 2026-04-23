import { db } from "../../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"
import {
  normalizeTemplateMaterialItem,
  type TemplateMaterialItemForm,
  type TemplateMaterialItemRow,
} from "@builders/domain"
import { listTemplateMaterialItems } from "./read-repository.js"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

const templateMaterialItemSelect = {
  id: true,
  productId: true,
  product: { select: { name: true } },
  quantity: true,
  unitPrice: true,
  notes: true,
  createdAt: true,
} as const

function toDecimal(value: string): Prisma.Decimal | string {
  return value
}

export async function createTemplateMaterialItemRecord(
  templateId: string,
  input: TemplateMaterialItemForm,
  client: TemplatesDbClient = db,
): Promise<TemplateMaterialItemRow> {
  const item = await client.flooringTemplateItem.create({
    data: {
      templateId,
      productId: input.productId,
      quantity: toDecimal(input.quantity),
      unitPrice: toDecimal(input.unitPrice),
      notes: input.notes ? input.notes : null,
    },
    select: templateMaterialItemSelect,
  })

  return normalizeTemplateMaterialItem(item)
}

export async function updateTemplateMaterialItemRecord(
  id: string,
  input: TemplateMaterialItemForm,
  client: TemplatesDbClient = db,
): Promise<TemplateMaterialItemRow> {
  const item = await client.flooringTemplateItem.update({
    where: { id },
    data: {
      productId: input.productId,
      quantity: toDecimal(input.quantity),
      unitPrice: toDecimal(input.unitPrice),
      notes: input.notes ? input.notes : null,
    },
    select: templateMaterialItemSelect,
  })

  return normalizeTemplateMaterialItem(item)
}

export async function deleteTemplateMaterialItemRecordById(
  id: string,
  client: TemplatesDbClient = db,
): Promise<void> {
  await client.flooringTemplateItem.delete({ where: { id } })
}

export type ApplyTemplateMaterialItemsDiffInput = {
  templateId: string
  added: Array<{ id: string; tempId: string; form: TemplateMaterialItemForm }>
  modified: Array<{ id: string; form: TemplateMaterialItemForm }>
  deleted: Array<{ id: string }>
}

export type ApplyTemplateMaterialItemsDiffResult = {
  items: TemplateMaterialItemRow[]
  tempIdMap: Record<string, string>
}

export async function applyTemplateMaterialItemsDiff(
  tx: Prisma.TransactionClient,
  input: ApplyTemplateMaterialItemsDiffInput,
): Promise<ApplyTemplateMaterialItemsDiffResult> {
  if (input.deleted.length > 0) {
    await tx.flooringTemplateItem.deleteMany({
      where: { id: { in: input.deleted.map((d) => d.id) } },
    })
  }

  const tempIdMap: Record<string, string> = {}
  for (const draft of input.added) {
    tempIdMap[draft.tempId] = draft.id
  }

  if (input.added.length > 0) {
    await tx.flooringTemplateItem.createMany({
      data: input.added.map((draft) => ({
        id: draft.id,
        templateId: input.templateId,
        productId: draft.form.productId,
        quantity: toDecimal(draft.form.quantity),
        unitPrice: toDecimal(draft.form.unitPrice),
        notes: draft.form.notes ? draft.form.notes : null,
      })),
    })
  }

  for (const update of input.modified) {
    await tx.flooringTemplateItem.update({
      where: { id: update.id },
      data: {
        productId: update.form.productId,
        quantity: toDecimal(update.form.quantity),
        unitPrice: toDecimal(update.form.unitPrice),
        notes: update.form.notes ? update.form.notes : null,
      },
    })
  }

  const items = await listTemplateMaterialItems(input.templateId, tx)
  return { items, tempIdMap }
}
