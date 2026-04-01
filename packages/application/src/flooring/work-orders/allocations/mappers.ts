import {
  buildInventoryAllocationTotals,
  calculateAllocationRowTotal,
  calculateInventoryPricePerUnit,
} from "@builders/domain"
import type {
  InventoryAllocationCandidateRow,
  WorkOrderAllocationRunRow,
  WorkOrderItemAllocationRow,
} from "@builders/db"
import type {
  InventoryAllocationOptionRecord,
  WorkOrderAllocationRunRecord,
  WorkOrderItemAllocationRecord,
} from "./types.js"

function buildInventoryAllocationLabel(input: {
  stockCount: string
  stockUnit: string
  itemNumber: string
  locationCode: string
  dyeLot: string
}) {
  const stockSummary = [input.stockCount, input.stockUnit].filter(Boolean).join(" ").trim()

  return [
    stockSummary,
    input.itemNumber ? `Item ${input.itemNumber}` : "",
    input.locationCode,
    input.dyeLot ? `Dye ${input.dyeLot}` : "",
  ]
    .filter(Boolean)
    .join(" - ")
}

export function mapWorkOrderItemAllocationRowToRecord(
  allocation: WorkOrderItemAllocationRow,
): WorkOrderItemAllocationRecord {
  return {
    id: allocation.id,
    workOrderItemId: allocation.workOrderItemId,
    inventoryId: allocation.inventoryId,
    quantity: allocation.quantity.toString(),
    cutSize: allocation.cutSize ?? "",
    unitCost: allocation.unitCost.toString(),
    totalCost: calculateAllocationRowTotal({
      quantity: allocation.quantity.toString(),
      unitCost: allocation.unitCost.toString(),
    }),
    method: allocation.method,
    notes: allocation.notes ?? "",
    createdAt: allocation.createdAt.toISOString(),
    updatedAt: allocation.updatedAt.toISOString(),
    inventory: {
      itemNumber: allocation.inventory.itemNumber,
      dyeLot: allocation.inventory.dyeLot ?? "",
      locationCode: allocation.inventory.location?.locationCode ?? "Unassigned",
      warehouseName:
        allocation.inventory.location?.warehouse.name ??
        allocation.inventory.importEntry?.warehouse?.name ??
        "",
      stockUnit: allocation.inventory.product.category.stockUnit?.name ?? "",
    },
  }
}

export function mapInventoryAllocationCandidateRowToOptionRecord(
  inventory: InventoryAllocationCandidateRow,
): InventoryAllocationOptionRecord {
  const allocationTotals = buildInventoryAllocationTotals({
    stockCount: inventory.stockCount.toString(),
    cutTotal: inventory.cutTotal,
    reservedStockCount: inventory.reservedStockCount.toString(),
  })
  const pricePerUnit = calculateInventoryPricePerUnit({
    stockCount: inventory.stockCount.toString(),
    cost: inventory.cost?.toString() ?? null,
    freight: inventory.freight?.toString() ?? null,
  })

  return {
    id: inventory.id,
    productId: inventory.productId,
    warehouseId: inventory.warehouseId,
    warehouseName: inventory.warehouseName,
    fifoReceivedAt: inventory.fifoReceivedAt.toISOString(),
    itemNumber: inventory.itemNumber,
    dyeLot: inventory.dyeLot,
    locationCode: inventory.locationCode,
    stockUnit: inventory.stockUnit,
    stockCount: inventory.stockCount.toString(),
    cutTotal: allocationTotals.cutTotal,
    reservedStockCount: inventory.reservedStockCount.toString(),
    totalAllocated: allocationTotals.totalAllocated.toFixed(2),
    unreservedTotal: allocationTotals.unreservedTotal.toFixed(2),
    availableToAllocate: allocationTotals.availableToAllocate,
    pricePerUnit,
    label: buildInventoryAllocationLabel({
      stockCount: inventory.stockCount.toString(),
      stockUnit: inventory.stockUnit,
      itemNumber: inventory.itemNumber,
      locationCode: inventory.locationCode,
      dyeLot: inventory.dyeLot,
    }),
  }
}

export function mapWorkOrderAllocationRunRowToRecord(run: WorkOrderAllocationRunRow): WorkOrderAllocationRunRecord {
  return {
    id: run.id,
    workOrderId: run.workOrderId,
    requestedByUserId: run.requestedByUserId,
    sourceVersion: run.sourceVersion.toISOString(),
    idempotencyKey: run.idempotencyKey,
    status: run.status,
    requestId: run.requestId,
    queueJobId: run.queueJobId,
    requestedAt: run.requestedAt.toISOString(),
    queuedAt: run.queuedAt?.toISOString() ?? null,
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
    failedAt: run.failedAt?.toISOString() ?? null,
    failureCode: run.failureCode,
    failureMessage: run.failureMessage,
    allocatedRowCount: run.allocatedRowCount,
    shortageCount: run.shortageCount,
  }
}
