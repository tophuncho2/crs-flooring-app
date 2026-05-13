import { db } from "../../../client.js"
import type { Prisma, PrismaClient } from "../../../generated/prisma/client.js"
import {
  normalizeWorkOrderMaterialItem,
  type ItemSendUnitSnapshot,
  type WorkOrderMaterialItemForm,
  type WorkOrderMaterialItemRow,
} from "@builders/domain"
import { listWorkOrderMaterialItems } from "./read-repository.js"

type WorkOrdersDbClient = PrismaClient | Prisma.TransactionClient

/**
 * Wire-input shape for material-item writes. Combines the user-supplied
 * form with the send-unit snapshot the application layer computes via
 * `buildItemSendUnitSnapshotFromProduct(product)` before calling here.
 *
 * Mirrors `WriteTemplateMaterialItemInput` — the application orchestration
 * is identical across both modules.
 */
export type WriteWorkOrderMaterialItemInput = WorkOrderMaterialItemForm & ItemSendUnitSnapshot

const workOrderMaterialItemSelect = {
  id: true,
  productId: true,
  product: { select: { name: true } },
  quantity: true,
  sendUnitName: true,
  sendUnitAbbrev: true,
  notes: true,
  status: true,
  sourceTemplateItemId: true,
  createdAt: true,
} as const

function toDecimal(value: string): Prisma.Decimal | string {
  return value
}

export async function createWorkOrderMaterialItemRecord(
  workOrderId: string,
  input: WriteWorkOrderMaterialItemInput,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderMaterialItemRow> {
  const item = await client.flooringWorkOrderItem.create({
    data: {
      workOrderId,
      productId: input.productId,
      quantity: toDecimal(input.quantity),
      sendUnitName: input.sendUnitName,
      sendUnitAbbrev: input.sendUnitAbbrev,
      notes: input.notes ? input.notes : null,
    },
    select: workOrderMaterialItemSelect,
  })

  return normalizeWorkOrderMaterialItem(item)
}

export async function updateWorkOrderMaterialItemRecord(
  id: string,
  input: WriteWorkOrderMaterialItemInput,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderMaterialItemRow> {
  const item = await client.flooringWorkOrderItem.update({
    where: { id },
    data: {
      productId: input.productId,
      quantity: toDecimal(input.quantity),
      sendUnitName: input.sendUnitName,
      sendUnitAbbrev: input.sendUnitAbbrev,
      notes: input.notes ? input.notes : null,
    },
    select: workOrderMaterialItemSelect,
  })

  return normalizeWorkOrderMaterialItem(item)
}

/**
 * Standalone delete. Nulls both link columns on any cut log that
 * referenced this WOMI, IN THE SAME transaction client, BEFORE the
 * WOMI delete fires. Schema's `onDelete: SetNull` would null
 * `workOrderItemId` automatically — but `workOrderId` would survive,
 * breaking `assertCutLogLinkageSymmetry`. We null both together to keep
 * the linkage invariant.
 */
export async function deleteWorkOrderMaterialItemRecordById(
  id: string,
  client: WorkOrdersDbClient = db,
): Promise<void> {
  await client.flooringCutLog.updateMany({
    where: { workOrderItemId: id },
    data: { workOrderId: null, workOrderItemId: null },
  })
  await client.flooringWorkOrderItem.delete({ where: { id } })
}

export type ApplyWorkOrderMaterialItemsDiffInput = {
  workOrderId: string
  added: Array<{ id: string; tempId: string; input: WriteWorkOrderMaterialItemInput }>
  modified: Array<{ id: string; input: WriteWorkOrderMaterialItemInput }>
  deleted: Array<{ id: string }>
}

export type ApplyWorkOrderMaterialItemsDiffResult = {
  items: WorkOrderMaterialItemRow[]
  tempIdMap: Record<string, string>
}

/**
 * Section-save diff applier. Mirrors templates' `applyTemplateMaterialItemsDiff`
 * with one addition: every WOMI in `deleted` has its linked cut logs'
 * link columns nulled together (workOrderId AND workOrderItemId) BEFORE
 * the WOMI rows are deleted. This keeps `assertCutLogLinkageSymmetry`
 * satisfied — the schema's `onDelete: SetNull` would null only one of
 * the two link columns.
 */
export async function applyWorkOrderMaterialItemsDiff(
  tx: Prisma.TransactionClient,
  input: ApplyWorkOrderMaterialItemsDiffInput,
): Promise<ApplyWorkOrderMaterialItemsDiffResult> {
  if (input.deleted.length > 0) {
    const deletedIds = input.deleted.map((d) => d.id)
    await tx.flooringCutLog.updateMany({
      where: { workOrderItemId: { in: deletedIds } },
      data: { workOrderId: null, workOrderItemId: null },
    })
    await tx.flooringWorkOrderItem.deleteMany({
      where: { id: { in: deletedIds } },
    })
  }

  const tempIdMap: Record<string, string> = {}
  for (const draft of input.added) {
    tempIdMap[draft.tempId] = draft.id
  }

  if (input.added.length > 0) {
    await tx.flooringWorkOrderItem.createMany({
      data: input.added.map((draft) => ({
        id: draft.id,
        workOrderId: input.workOrderId,
        productId: draft.input.productId,
        quantity: toDecimal(draft.input.quantity),
        sendUnitName: draft.input.sendUnitName,
        sendUnitAbbrev: draft.input.sendUnitAbbrev,
        notes: draft.input.notes ? draft.input.notes : null,
      })),
    })
  }

  for (const update of input.modified) {
    await tx.flooringWorkOrderItem.update({
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

  const items = await listWorkOrderMaterialItems(input.workOrderId, tx)
  return { items, tempIdMap }
}

