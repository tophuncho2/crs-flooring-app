import { db } from "../../../client.js"
import type { Prisma, PrismaClient } from "../../../generated/prisma/client.js"
import {
  normalizeWorkOrderMaterialItem,
  normalizeWorkOrderMaterialItemOption,
  type WorkOrderMaterialItemOption,
  type WorkOrderMaterialItemRow,
} from "@builders/domain"

type WorkOrdersDbClient = PrismaClient | Prisma.TransactionClient

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

export async function listWorkOrderMaterialItems(
  workOrderId: string,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderMaterialItemRow[]> {
  const items = await client.flooringWorkOrderItem.findMany({
    where: { workOrderId },
    select: workOrderMaterialItemSelect,
    orderBy: { createdAt: "asc" },
  })

  // hasInventoryAdjustments gates product editability — an item with linked
  // adjustments locks its product.
  const adjustmentCounts = await countAdjustmentsByWorkOrderItemIds(
    items.map((item) => item.id),
    client,
  )

  return items.map((item) =>
    normalizeWorkOrderMaterialItem(item, (adjustmentCounts.get(item.id) ?? 0) > 0),
  )
}

/**
 * Async-picker search: WOMI options scoped to a work order and a product.
 * Drives the cut-log relink material-item dropdown. No free-text search —
 * the per-WO row count is small enough that the picker renders all
 * matching WOMIs in `createdAt` order.
 */
export type SearchWorkOrderMaterialItemOptionsInput = {
  workOrderId: string
  productId: string
  take?: number
}

const workOrderMaterialItemOptionSelect = {
  id: true,
  productId: true,
  product: { select: { name: true } },
  quantity: true,
  sendUnitAbbrev: true,
  notes: true,
} as const

export async function searchWorkOrderMaterialItemOptions(
  input: SearchWorkOrderMaterialItemOptionsInput,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderMaterialItemOption[]> {
  const items = await client.flooringWorkOrderItem.findMany({
    where: {
      workOrderId: input.workOrderId,
      productId: input.productId,
    },
    select: workOrderMaterialItemOptionSelect,
    orderBy: { createdAt: "asc" },
    take: input.take ?? 50,
  })

  return items.map(normalizeWorkOrderMaterialItemOption)
}

/**
 * Counts inventory adjustments per WOMI id. Only DEDUCTION adjustments can
 * carry a WO link, so this is implicitly a WO-linked-cut count. Used by the
 * UI to show a badge per row + by the application layer when surfacing
 * whether a deletion will unlink existing adjustments (purely informational
 * since deletion is no longer blocked — the data write nulls the link
 * columns inside the diff TX).
 */
export async function countAdjustmentsByWorkOrderItemIds(
  workOrderItemIds: string[],
  client: WorkOrdersDbClient = db,
): Promise<Map<string, number>> {
  if (workOrderItemIds.length === 0) return new Map()

  const groups = await client.flooringInventoryAdjustment.groupBy({
    by: ["workOrderItemId"],
    where: {
      workOrderItemId: { in: workOrderItemIds },
    },
    _count: { _all: true },
  })

  const counts = new Map<string, number>()
  for (const group of groups) {
    if (group.workOrderItemId === null) continue
    counts.set(group.workOrderItemId, group._count._all)
  }
  return counts
}

