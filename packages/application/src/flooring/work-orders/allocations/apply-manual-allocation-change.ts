import { Prisma } from "@builders/db"
import {
  assertAllocationBelongsToWorkOrderItem,
  assertAllocationFitsInventoryAvailability,
  assertAllocationFitsWorkOrderItemQuantity,
  assertWorkOrderAllocationCompatibility,
  calculateInventoryPricePerUnit,
} from "@builders/domain"
import {
  createWorkOrderItemAllocationRow,
  db,
  getAllocatedQuantityForWorkOrderItem,
  getInventoryAllocationContext,
  getReservedQuantityForInventory,
  getWorkOrderItemAllocationContext,
  getWorkOrderItemAllocationOwnership,
  lockInventoryRows,
  normalizeInventoryAllocationCandidateRow,
  updateWorkOrderItemAllocationRow,
  type WorkOrderAllocationDbClient,
} from "@builders/db"
import { WorkOrderAllocationExecutionError } from "./errors.js"

export async function applyManualAllocationChangeUseCase(
  input: {
    workOrderId: string
    workOrderItemId: string
    inventoryId?: string
    quantity?: Prisma.Decimal
    cutSize?: string | null
    notes?: string | null
    allocationId?: string
  },
  client?: WorkOrderAllocationDbClient,
) {
  const item = await getWorkOrderItemAllocationContext(input.workOrderId, input.workOrderItemId, client)

  if (input.allocationId) {
    const existing = await getWorkOrderItemAllocationOwnership(input.allocationId, client)
    if (!existing) {
      throw new WorkOrderAllocationExecutionError({
        code: "ALLOCATION_NOT_FOUND",
        message: "Allocation not found",
        status: 404,
        field: "allocationId",
      })
    }

    assertAllocationBelongsToWorkOrderItem({
      expectedWorkOrderItemId: item.id,
      actualWorkOrderItemId: existing.workOrderItemId,
    })

    const nextInventoryId = input.inventoryId ?? existing.inventoryId
    const nextQuantity = input.quantity ?? existing.quantity

    await lockInventoryRows(client ?? db, [existing.inventoryId, nextInventoryId])

    const inventory = await getInventoryAllocationContext(nextInventoryId, client)
    const inventoryCandidate = normalizeInventoryAllocationCandidateRow(inventory)

    assertWorkOrderAllocationCompatibility({
      itemProductId: item.productId,
      workOrderWarehouseId: item.workOrder.warehouseId,
      inventoryProductId: inventory.productId,
      inventoryWarehouseId: inventoryCandidate?.warehouseId ?? null,
    })

    const reservedQuantity = await getReservedQuantityForInventory(inventory.id, existing.id, client)
    const allocatedQuantity = await getAllocatedQuantityForWorkOrderItem(item.id, existing.id, client)

    assertAllocationFitsInventoryAvailability({
      quantity: nextQuantity.toString(),
      stockCount: inventory.stockCount.toString(),
      cutTotal: inventoryCandidate?.cutTotal ?? 0,
      reservedStockCount: reservedQuantity.toString(),
    })
    assertAllocationFitsWorkOrderItemQuantity({
      requiredQuantity: item.quantity.toString(),
      existingAllocatedQuantity: allocatedQuantity.toString(),
      allocationQuantity: nextQuantity.toString(),
    })

    const allocation = await updateWorkOrderItemAllocationRow(
      {
        allocationId: existing.id,
        inventoryId: nextInventoryId,
        quantity: nextQuantity,
        cutSize: input.cutSize,
        notes: input.notes,
        unitCost: new Prisma.Decimal(
          calculateInventoryPricePerUnit({
            stockCount: inventory.stockCount.toString(),
            cost: inventory.cost?.toString() ?? null,
            freight: inventory.freight?.toString() ?? null,
          }),
        ),
      },
      client,
    )

    return {
      allocation,
      touchedInventoryIds: Array.from(new Set([existing.inventoryId, allocation.inventoryId])),
    }
  }

  if (!input.inventoryId || !input.quantity) {
    throw new WorkOrderAllocationExecutionError({
      code: "ALLOCATION_INPUT_REQUIRED",
      message: "Inventory and quantity are required to create an allocation",
      status: 400,
      field: !input.inventoryId ? "inventoryId" : "quantity",
    })
  }

  await lockInventoryRows(client ?? db, [input.inventoryId])

  const inventory = await getInventoryAllocationContext(input.inventoryId, client)
  const inventoryCandidate = normalizeInventoryAllocationCandidateRow(inventory)

  assertWorkOrderAllocationCompatibility({
    itemProductId: item.productId,
    workOrderWarehouseId: item.workOrder.warehouseId,
    inventoryProductId: inventory.productId,
    inventoryWarehouseId: inventoryCandidate?.warehouseId ?? null,
  })

  const reservedQuantity = await getReservedQuantityForInventory(inventory.id, undefined, client)
  const allocatedQuantity = await getAllocatedQuantityForWorkOrderItem(item.id, undefined, client)

  assertAllocationFitsInventoryAvailability({
    quantity: input.quantity.toString(),
    stockCount: inventory.stockCount.toString(),
    cutTotal: inventoryCandidate?.cutTotal ?? 0,
    reservedStockCount: reservedQuantity.toString(),
  })
  assertAllocationFitsWorkOrderItemQuantity({
    requiredQuantity: item.quantity.toString(),
    existingAllocatedQuantity: allocatedQuantity.toString(),
    allocationQuantity: input.quantity.toString(),
  })

  const allocation = await createWorkOrderItemAllocationRow(
    {
      workOrderItemId: item.id,
      inventoryId: inventory.id,
      quantity: input.quantity,
      cutSize: input.cutSize,
      notes: input.notes,
      method: "MANUAL",
      unitCost: new Prisma.Decimal(
        calculateInventoryPricePerUnit({
          stockCount: inventory.stockCount.toString(),
          cost: inventory.cost?.toString() ?? null,
          freight: inventory.freight?.toString() ?? null,
        }),
      ),
    },
    client,
  )

  return {
    allocation,
    touchedInventoryIds: [allocation.inventoryId],
  }
}
