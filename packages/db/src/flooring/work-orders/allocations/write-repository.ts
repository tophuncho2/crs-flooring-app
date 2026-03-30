import { Prisma } from "@prisma/client"
import { db } from "../../../client.js"
import { allocationSelect, type WorkOrderAllocationDbClient, type WorkOrderItemAllocationMethodRecord } from "./shared.js"

export async function refreshInventoryReservedStockCounts(
  inventoryIds: string[],
  client: WorkOrderAllocationDbClient = db,
) {
  for (const inventoryId of Array.from(new Set(inventoryIds.filter(Boolean)))) {
    const result = await client.flooringWorkOrderItemAllocation.aggregate({
      where: { inventoryId },
      _sum: {
        quantity: true,
      },
    })

    await client.flooringInventory.update({
      where: { id: inventoryId },
      data: {
        reservedStockCount: result._sum.quantity ?? new Prisma.Decimal(0),
      },
    })
  }
}

export async function createWorkOrderItemAllocationRow(
  input: {
    workOrderItemId: string
    inventoryId: string
    quantity: Prisma.Decimal
    unitCost: Prisma.Decimal
    cutSize?: string | null
    notes?: string | null
    method?: WorkOrderItemAllocationMethodRecord
  },
  client: WorkOrderAllocationDbClient = db,
) {
  return client.flooringWorkOrderItemAllocation.create({
    data: {
      workOrderItemId: input.workOrderItemId,
      inventoryId: input.inventoryId,
      quantity: input.quantity,
      cutSize: input.cutSize ?? null,
      unitCost: input.unitCost,
      method: input.method ?? "MANUAL",
      notes: input.notes ?? null,
    },
    select: allocationSelect,
  })
}

export async function updateWorkOrderItemAllocationRow(
  input: {
    allocationId: string
    inventoryId?: string
    quantity?: Prisma.Decimal
    cutSize?: string | null
    notes?: string | null
    unitCost?: Prisma.Decimal
  },
  client: WorkOrderAllocationDbClient = db,
) {
  return client.flooringWorkOrderItemAllocation.update({
    where: { id: input.allocationId },
    data: {
      ...(input.inventoryId !== undefined ? { inventoryId: input.inventoryId } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.cutSize !== undefined ? { cutSize: input.cutSize } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.unitCost !== undefined ? { unitCost: input.unitCost } : {}),
    },
    select: allocationSelect,
  })
}

export async function deleteWorkOrderItemAllocationRow(
  allocationId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  return client.flooringWorkOrderItemAllocation.delete({
    where: { id: allocationId },
  })
}

export async function deleteAllAllocationsForWorkOrderItem(
  workOrderItemId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  return client.flooringWorkOrderItemAllocation.deleteMany({
    where: { workOrderItemId },
  })
}

export async function deleteAllAutoAllocationsForWorkOrder(
  workOrderId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  return client.flooringWorkOrderItemAllocation.deleteMany({
    where: {
      method: "AUTO",
      workOrderItem: {
        workOrderId,
      },
    },
  })
}

export async function clearAllocationsForWorkOrder(
  workOrderId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  return client.flooringWorkOrderItemAllocation.deleteMany({
    where: {
      workOrderItem: {
        workOrderId,
      },
    },
  })
}

export async function setWorkOrderItemAllocationStates(
  states: Array<{
    itemId: string
    allocationStatus: "NOT_STARTED" | "PARTIALLY_ALLOCATED" | "FULLY_ALLOCATED" | "SHORTAGE"
    changeOrderStatus: "SUFFICIENT" | "SHORTAGE"
  }>,
  client: WorkOrderAllocationDbClient = db,
) {
  for (const state of states) {
    await client.flooringWorkOrderItem.update({
      where: { id: state.itemId },
      data: {
        allocationStatus: state.allocationStatus,
        changeOrderStatus: state.changeOrderStatus,
      },
    })
  }
}
