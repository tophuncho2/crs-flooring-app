import { db } from "../../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"
import {
  computeTemplateMaterialItemsDiff,
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

export async function saveTemplateMaterialItemsSection(
  templateId: string,
  next: Array<{ id: string | null; form: TemplateMaterialItemForm }>,
  client: TemplatesDbClient = db,
): Promise<TemplateMaterialItemRow[]> {
  const existing = await listTemplateMaterialItems(templateId, client)
  const diff = computeTemplateMaterialItemsDiff(existing, next)

  if (diff.deletes.length > 0) {
    await client.flooringTemplateItem.deleteMany({ where: { id: { in: diff.deletes } } })
  }

  for (const update of diff.updates) {
    await client.flooringTemplateItem.update({
      where: { id: update.id },
      data: {
        productId: update.form.productId,
        quantity: toDecimal(update.form.quantity),
        unitPrice: toDecimal(update.form.unitPrice),
        notes: update.form.notes ? update.form.notes : null,
      },
    })
  }

  for (const create of diff.creates) {
    await client.flooringTemplateItem.create({
      data: {
        templateId,
        productId: create.productId,
        quantity: toDecimal(create.quantity),
        unitPrice: toDecimal(create.unitPrice),
        notes: create.notes ? create.notes : null,
      },
    })
  }

  return listTemplateMaterialItems(templateId, client)
}
