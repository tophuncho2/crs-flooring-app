import { Prisma } from "@prisma/client"
import { db } from "../../../client.js"
import {
  allocationSelect,
  allocationRunSelect,
  inventoryAllocationCandidateQuery,
  normalizeInventoryAllocationCandidateRow,
  type InventoryAllocationCandidateRow,
  type InventoryAllocationContextRow,
  type WorkOrderAllocationDbClient,
  type WorkOrderAllocationRunRow,
  type WorkOrderItemAllocationRow,
} from "./shared.js"

export async function lockWorkOrderAllocationScope(
  client: WorkOrderAllocationDbClient,
  workOrderId: string,
) {
  await client.$queryRaw(
    Prisma.sql`SELECT "id" FROM "flooring_work_order" WHERE "id" = ${workOrderId} FOR UPDATE`,
  )
}

export async function lockInventoryRows(client: WorkOrderAllocationDbClient, inventoryIds: string[]) {
  const uniqueInventoryIds = Array.from(new Set(inventoryIds.filter(Boolean)))
  if (uniqueInventoryIds.length === 0) {
    return
  }

  await client.$queryRaw(
    Prisma.sql`SELECT "id" FROM "flooring_inventory" WHERE "id" IN (${Prisma.join(uniqueInventoryIds)}) FOR UPDATE`,
  )
}

export async function getWorkOrderItemAllocationContext(
  workOrderId: string,
  itemId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  return client.flooringWorkOrderItem.findFirstOrThrow({
    where: {
      id: itemId,
      workOrderId,
    },
    select: {
      id: true,
      productId: true,
      quantity: true,
      workOrder: {
        select: {
          id: true,
          warehouseId: true,
          updatedAt: true,
        },
      },
    },
  })
}

export async function getInventoryAllocationContext(
  inventoryId: string,
  client: WorkOrderAllocationDbClient = db,
): Promise<InventoryAllocationContextRow> {
  return client.flooringInventory.findUniqueOrThrow({
    where: { id: inventoryId },
    select: inventoryAllocationCandidateQuery.select,
  })
}

export async function getReservedQuantityForInventory(
  inventoryId: string,
  excludeAllocationId?: string,
  client: WorkOrderAllocationDbClient = db,
) {
  const result = await client.flooringWorkOrderItemAllocation.aggregate({
    where: {
      inventoryId,
      ...(excludeAllocationId ? { id: { not: excludeAllocationId } } : {}),
    },
    _sum: {
      quantity: true,
    },
  })

  return result._sum.quantity ?? new Prisma.Decimal(0)
}

export async function getAllocatedQuantityForWorkOrderItem(
  workOrderItemId: string,
  excludeAllocationId?: string,
  client: WorkOrderAllocationDbClient = db,
) {
  const result = await client.flooringWorkOrderItemAllocation.aggregate({
    where: {
      workOrderItemId,
      ...(excludeAllocationId ? { id: { not: excludeAllocationId } } : {}),
    },
    _sum: {
      quantity: true,
    },
  })

  return result._sum.quantity ?? new Prisma.Decimal(0)
}

export async function getWorkOrderItemAllocationOwnership(
  allocationId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  return client.flooringWorkOrderItemAllocation.findUnique({
    where: { id: allocationId },
    select: {
      id: true,
      workOrderItemId: true,
      inventoryId: true,
      updatedAt: true,
      quantity: true,
    },
  })
}

export async function getWorkOrderItemAllocationInventoryContext(
  allocationId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  return client.flooringWorkOrderItemAllocation.findUnique({
    where: { id: allocationId },
    select: {
      id: true,
      inventoryId: true,
    },
  })
}

export async function listWorkOrderAllocationInventoryIds(
  workOrderId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  const allocations = await client.flooringWorkOrderItemAllocation.findMany({
    where: {
      workOrderItem: {
        workOrderId,
      },
    },
    select: {
      inventoryId: true,
    },
  })

  return Array.from(new Set(allocations.map((allocation) => allocation.inventoryId)))
}

export async function listWorkOrderItemAllocationRows(
  workOrderId: string,
  workOrderItemId: string,
  client: WorkOrderAllocationDbClient = db,
): Promise<WorkOrderItemAllocationRow[]> {
  await getWorkOrderItemAllocationContext(workOrderId, workOrderItemId, client)

  return client.flooringWorkOrderItemAllocation.findMany({
    where: {
      workOrderItemId,
    },
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" },
    ],
    select: allocationSelect,
  })
}

async function listInventoryAllocationCandidateRows(
  where: Prisma.FlooringInventoryWhereInput,
  client: WorkOrderAllocationDbClient,
) {
  const inventories = await client.flooringInventory.findMany({
    where,
    orderBy: inventoryAllocationCandidateQuery.orderBy,
    select: inventoryAllocationCandidateQuery.select,
  })

  return inventories
    .map((inventory) => normalizeInventoryAllocationCandidateRow(inventory))
    .filter((inventory): inventory is InventoryAllocationCandidateRow => Boolean(inventory))
}

export async function listInventoryAllocationCandidateRowsForWorkOrderItem(
  workOrderId: string,
  workOrderItemId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  const item = await getWorkOrderItemAllocationContext(workOrderId, workOrderItemId, client)
  if (!item.workOrder.warehouseId) {
    return []
  }

  return listInventoryAllocationCandidateRows(
    {
      productId: item.productId,
      OR: [
        {
          location: {
            warehouseId: item.workOrder.warehouseId,
          },
        },
        {
          importEntry: {
            warehouseId: item.workOrder.warehouseId,
          },
        },
      ],
    },
    client,
  )
}

export async function listInventoryAllocationCandidateRowsForWorkOrderProduct(
  workOrderId: string,
  productId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  const workOrder = await client.flooringWorkOrder.findUniqueOrThrow({
    where: { id: workOrderId },
    select: {
      warehouseId: true,
    },
  })

  if (!workOrder.warehouseId) {
    return []
  }

  return listInventoryAllocationCandidateRows(
    {
      productId,
      OR: [
        {
          location: {
            warehouseId: workOrder.warehouseId,
          },
        },
        {
          importEntry: {
            warehouseId: workOrder.warehouseId,
          },
        },
      ],
    },
    client,
  )
}

export async function listAutoAllocationInventoryCandidateRows(
  workOrderId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  const workOrder = await client.flooringWorkOrder.findUniqueOrThrow({
    where: { id: workOrderId },
    select: {
      warehouseId: true,
      items: {
        select: {
          productId: true,
        },
      },
    },
  })

  if (!workOrder.warehouseId) {
    return []
  }

  const productIds = Array.from(new Set(workOrder.items.map((item) => item.productId)))
  if (productIds.length === 0) {
    return []
  }

  return listInventoryAllocationCandidateRows(
    {
      productId: {
        in: productIds,
      },
      OR: [
        {
          location: {
            warehouseId: workOrder.warehouseId,
          },
        },
        {
          importEntry: {
            warehouseId: workOrder.warehouseId,
          },
        },
      ],
    },
    client,
  )
}

export async function getWorkOrderAllocationStatusContext(
  workOrderId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  return client.flooringWorkOrder.findUniqueOrThrow({
    where: { id: workOrderId },
    select: {
      id: true,
      warehouseId: true,
      updatedAt: true,
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          allocations: {
            select: {
              quantity: true,
              unitCost: true,
            },
          },
        },
      },
    },
  })
}

export async function findActiveWorkOrderAllocationRunRow(
  workOrderId: string,
  client: WorkOrderAllocationDbClient = db,
): Promise<WorkOrderAllocationRunRow | null> {
  return client.flooringWorkOrderAllocationRun.findFirst({
    where: {
      workOrderId,
      status: {
        in: ["REQUESTED", "QUEUED", "PROCESSING"],
      },
    },
    orderBy: {
      requestedAt: "desc",
    },
    select: allocationRunSelect,
  })
}

export async function findWorkOrderAllocationRunRowBySourceVersion(
  workOrderId: string,
  sourceVersion: Date,
  client: WorkOrderAllocationDbClient = db,
): Promise<WorkOrderAllocationRunRow | null> {
  return client.flooringWorkOrderAllocationRun.findUnique({
    where: {
      workOrderId_sourceVersion: {
        workOrderId,
        sourceVersion,
      },
    },
    select: allocationRunSelect,
  })
}

export async function getLatestWorkOrderAllocationRunRow(
  workOrderId: string,
  client: WorkOrderAllocationDbClient = db,
): Promise<WorkOrderAllocationRunRow | null> {
  return client.flooringWorkOrderAllocationRun.findFirst({
    where: { workOrderId },
    orderBy: {
      requestedAt: "desc",
    },
    select: allocationRunSelect,
  })
}

export async function getWorkOrderAllocationRunRowById(
  allocationRunId: string,
  client: WorkOrderAllocationDbClient = db,
): Promise<WorkOrderAllocationRunRow> {
  return client.flooringWorkOrderAllocationRun.findUniqueOrThrow({
    where: { id: allocationRunId },
    select: allocationRunSelect,
  })
}

export async function getWorkOrderAutoAllocationSourceContext(
  allocationRunId: string,
  client: WorkOrderAllocationDbClient = db,
) {
  const allocationRun = await getWorkOrderAllocationRunRowById(allocationRunId, client)
  const workOrder = await client.flooringWorkOrder.findUniqueOrThrow({
    where: { id: allocationRun.workOrderId },
    select: {
      id: true,
      warehouseId: true,
      updatedAt: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          productId: true,
          quantity: true,
          allocations: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: allocationSelect,
          },
        },
      },
    },
  })

  return {
    allocationRun,
    workOrder,
    inventoryCandidates: workOrder.warehouseId
      ? await listAutoAllocationInventoryCandidateRows(workOrder.id, client)
      : [],
  }
}
