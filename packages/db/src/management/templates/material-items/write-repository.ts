import { db } from "../../../client.js"
import type { Prisma, PrismaClient } from "../../../generated/prisma/client.js"
import {
  normalizeTemplateMaterialItem,
  type ItemSendUnitSnapshot,
  type TemplateMaterialItemForm,
  type TemplateMaterialItemRow,
} from "@builders/domain"
import { listTemplateMaterialItems } from "./read-repository.js"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

// Wire-input shape for material-item writes. Combines the user-supplied form
// with the send-unit snapshot the application layer computes via
// `buildItemSendUnitSnapshotFromProduct(product)` before calling here.
//
// Reused-shape pattern: WO MI's data-layer write input will look the same
// (form + ItemSendUnitSnapshot), so the application orchestration is identical
// across both modules.
export type WriteTemplateMaterialItemInput = TemplateMaterialItemForm & ItemSendUnitSnapshot

const templateMaterialItemSelect = {
  id: true,
  productId: true,
  product: { select: { name: true } },
  quantity: true,
  sendUnitName: true,
  sendUnitAbbrev: true,
  notes: true,
  createdAt: true,
} as const

function toDecimal(value: string): Prisma.Decimal | string {
  return value
}

export async function createTemplateMaterialItemRecord(
  templateId: string,
  input: WriteTemplateMaterialItemInput,
  client: TemplatesDbClient = db,
): Promise<TemplateMaterialItemRow> {
  const item = await client.flooringTemplateItem.create({
    data: {
      templateId,
      productId: input.productId,
      quantity: toDecimal(input.quantity),
      sendUnitName: input.sendUnitName,
      sendUnitAbbrev: input.sendUnitAbbrev,
      notes: input.notes ? input.notes : null,
    },
    select: templateMaterialItemSelect,
  })

  return normalizeTemplateMaterialItem(item)
}

export async function updateTemplateMaterialItemRecord(
  id: string,
  input: WriteTemplateMaterialItemInput,
  client: TemplatesDbClient = db,
): Promise<TemplateMaterialItemRow> {
  const item = await client.flooringTemplateItem.update({
    where: { id },
    data: {
      productId: input.productId,
      quantity: toDecimal(input.quantity),
      sendUnitName: input.sendUnitName,
      sendUnitAbbrev: input.sendUnitAbbrev,
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
  added: Array<{ id: string; tempId: string; input: WriteTemplateMaterialItemInput }>
  modified: Array<{ id: string; input: WriteTemplateMaterialItemInput }>
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
        productId: draft.input.productId,
        quantity: toDecimal(draft.input.quantity),
        sendUnitName: draft.input.sendUnitName,
        sendUnitAbbrev: draft.input.sendUnitAbbrev,
        notes: draft.input.notes ? draft.input.notes : null,
      })),
    })
  }

  for (const update of input.modified) {
    await tx.flooringTemplateItem.update({
      where: { id: update.id },
      data: {
        productId: update.input.productId,
        quantity: toDecimal(update.input.quantity),
        sendUnitName: update.input.sendUnitName,
        sendUnitAbbrev: update.input.sendUnitAbbrev,
        notes: update.input.notes ? update.input.notes : null,
      },
    })
  }

  const items = await listTemplateMaterialItems(input.templateId, tx)
  return { items, tempIdMap }
}
