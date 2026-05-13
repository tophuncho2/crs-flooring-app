import { db } from "../../../client.js"
import type { Prisma, PrismaClient } from "../../../generated/prisma/client.js"
import {
  normalizeWorkOrderMaterialItem,
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

  return items.map(normalizeWorkOrderMaterialItem)
}

/**
 * Counts non-void cut logs per WOMI id. Used by the UI to show a cut-log
 * badge per row + by the application layer when surfacing whether a
 * deletion will unlink existing cut logs (purely informational since
 * deletion is no longer blocked — the data write nulls the link columns
 * inside the diff TX).
 */
export async function countCutLogsByWorkOrderItemIds(
  workOrderItemIds: string[],
  client: WorkOrdersDbClient = db,
): Promise<Map<string, number>> {
  if (workOrderItemIds.length === 0) return new Map()

  const groups = await client.flooringCutLog.groupBy({
    by: ["workOrderItemId"],
    where: {
      workOrderItemId: { in: workOrderItemIds },
      void: false,
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

export type EligibleInventoryRow = {
  id: string
  inventoryItem: string
  startingStock: string
  totalCutSum: string
  remainingStock: string
  stockUnitAbbrev: string
}

/**
 * Returns inventory rows eligible for a new pending cut on this WOMI:
 * same warehouse as the parent WO, same product as the WOMI, and at
 * least some remaining stock (`startingStock - totalCutSum > 0`). Drives
 * the inventory dropdown in the cut-log expandable row UI.
 */
export async function listEligibleInventoryForWorkOrderItem(
  args: { workOrderId: string; workOrderItemId: string },
  client: WorkOrdersDbClient = db,
): Promise<EligibleInventoryRow[]> {
  const womi = await client.flooringWorkOrderItem.findUniqueOrThrow({
    where: { id: args.workOrderItemId },
    select: {
      productId: true,
      workOrder: { select: { warehouseId: true } },
    },
  })

  if (womi.workOrder.warehouseId === null) return []

  const inventories = await client.flooringInventory.findMany({
    where: {
      productId: womi.productId,
      warehouseId: womi.workOrder.warehouseId,
      isArchived: false,
    },
    select: {
      id: true,
      inventoryItem: true,
      startingStock: true,
      totalCutSum: true,
      stockUnitAbbrev: true,
    },
    orderBy: { fifoReceivedAt: "asc" },
  })

  return inventories
    .map((inv) => {
      const startingStock = Number(inv.startingStock)
      const totalCutSum = Number(inv.totalCutSum)
      const remaining = startingStock - totalCutSum
      return {
        id: inv.id,
        inventoryItem: inv.inventoryItem,
        startingStock: inv.startingStock.toString(),
        totalCutSum: inv.totalCutSum.toString(),
        remainingStock: remaining.toFixed(2),
        stockUnitAbbrev: inv.stockUnitAbbrev ?? "",
        _remaining: remaining,
      }
    })
    .filter((row) => row._remaining > 0)
    .map(({ _remaining: _r, ...row }) => row)
}
