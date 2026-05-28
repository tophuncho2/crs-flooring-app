import { db } from "../../../client.js"
import type { Prisma, PrismaClient } from "../../../generated/prisma/client.js"
import {
  normalizeWorkOrderMaterialItem,
  type ItemSendUnitSnapshot,
  type WorkOrderMaterialItemCreateForm,
  type WorkOrderMaterialItemRow,
} from "@builders/domain"
import { listWorkOrderMaterialItems } from "./read-repository.js"

type WorkOrdersDbClient = PrismaClient | Prisma.TransactionClient

/**
 * Wire-input shape for material-item creates. Combines the user-supplied
 * create form with the send-unit snapshot the application layer computes
 * via `buildItemSendUnitSnapshotFromProduct(product)` before calling here.
 */
export type WriteWorkOrderMaterialItemCreateInput =
  WorkOrderMaterialItemCreateForm & ItemSendUnitSnapshot

/**
 * Wire-input shape for material-item updates. Always carries the mutable
 * quantity/notes. `product` is present only when the product changed (allowed
 * while the item has no cut logs); it carries the re-snapshotted send units
 * for the new product so the snapshot stays consistent with `productId`.
 */
export type WriteWorkOrderMaterialItemUpdateInput = {
  quantity: string
  notes: string
  product?: { productId: string } & ItemSendUnitSnapshot
}

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

// Quantity is optional: a blank string means "unset" and is stored as
// NULL. A non-blank string is handed straight to Prisma, which coerces it
// to Decimal.
function toDecimal(value: string): Prisma.Decimal | string | null {
  return value.trim() ? value : null
}

export async function createWorkOrderMaterialItemRecord(
  workOrderId: string,
  input: WriteWorkOrderMaterialItemCreateInput,
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
  input: WriteWorkOrderMaterialItemUpdateInput,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderMaterialItemRow> {
  const item = await client.flooringWorkOrderItem.update({
    where: { id },
    data: {
      quantity: toDecimal(input.quantity),
      notes: input.notes ? input.notes : null,
      ...(input.product
        ? {
            product: { connect: { id: input.product.productId } },
            sendUnitName: input.product.sendUnitName,
            sendUnitAbbrev: input.product.sendUnitAbbrev,
          }
        : {}),
    },
    select: workOrderMaterialItemSelect,
  })

  return normalizeWorkOrderMaterialItem(item)
}

/**
 * Standalone delete. Nulls both link columns on any inventory adjustment
 * that referenced this WOMI, IN THE SAME transaction client, BEFORE the
 * WOMI delete fires. Schema's `onDelete: SetNull` would null
 * `workOrderItemId` automatically — but `workOrderId` would survive,
 * breaking `assertAdjustmentLinkageRules`. We null both together to keep
 * the linkage invariant.
 */
export async function deleteWorkOrderMaterialItemRecordById(
  id: string,
  client: WorkOrdersDbClient = db,
): Promise<void> {
  await client.flooringInventoryAdjustment.updateMany({
    where: { workOrderItemId: id },
    data: { workOrderId: null, workOrderItemId: null },
  })
  await client.flooringWorkOrderItem.delete({ where: { id } })
}

export type ApplyWorkOrderMaterialItemsDiffInput = {
  workOrderId: string
  added: Array<{ id: string; tempId: string; input: WriteWorkOrderMaterialItemCreateInput }>
  modified: Array<{ id: string; input: WriteWorkOrderMaterialItemUpdateInput }>
  deleted: Array<{ id: string }>
}

export type ApplyWorkOrderMaterialItemsDiffResult = {
  items: WorkOrderMaterialItemRow[]
  tempIdMap: Record<string, string>
}

/**
 * Section-save diff applier. Mirrors templates' `applyTemplateMaterialItemsDiff`
 * with one addition: every WOMI in `deleted` has its linked inventory
 * adjustments' link columns nulled together (workOrderId AND
 * workOrderItemId) BEFORE the WOMI rows are deleted. This keeps
 * `assertAdjustmentLinkageRules` satisfied — the schema's
 * `onDelete: SetNull` would null only one of the two link columns.
 */
export async function applyWorkOrderMaterialItemsDiff(
  tx: Prisma.TransactionClient,
  input: ApplyWorkOrderMaterialItemsDiffInput,
): Promise<ApplyWorkOrderMaterialItemsDiffResult> {
  if (input.deleted.length > 0) {
    const deletedIds = input.deleted.map((d) => d.id)
    await tx.flooringInventoryAdjustment.updateMany({
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
        quantity: toDecimal(update.input.quantity),
        notes: update.input.notes ? update.input.notes : null,
        ...(update.input.product
          ? {
              product: { connect: { id: update.input.product.productId } },
              sendUnitName: update.input.product.sendUnitName,
              sendUnitAbbrev: update.input.product.sendUnitAbbrev,
            }
          : {}),
      },
    })
  }

  const items = await listWorkOrderMaterialItems(input.workOrderId, tx)
  return { items, tempIdMap }
}

