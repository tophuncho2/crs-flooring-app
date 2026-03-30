import { buildInventoryAllocationTotals } from "../../shared/inventory-allocation-totals.js"
import { createWorkOrderAllocationDomainError } from "./errors.js"
import { toAllocationNumber } from "./shared.js"

export function assertAllocationBelongsToWorkOrderItem(input: {
  expectedWorkOrderItemId: string
  actualWorkOrderItemId: string
}) {
  if (input.expectedWorkOrderItemId !== input.actualWorkOrderItemId) {
    throw createWorkOrderAllocationDomainError({
      code: "ALLOCATION_ITEM_MISMATCH",
      message: "Allocation does not belong to the selected material item",
      field: "allocationId",
    })
  }
}

export function assertAllocationFitsInventoryAvailability(input: {
  quantity: string | number
  stockCount: string | number
  cutTotal: string | number
  reservedStockCount: string | number
}) {
  const totals = buildInventoryAllocationTotals({
    stockCount: input.stockCount,
    cutTotal: input.cutTotal,
    reservedStockCount: input.reservedStockCount,
  })

  if (toAllocationNumber(input.quantity) - totals.availableToAllocate > 0.0001) {
    throw createWorkOrderAllocationDomainError({
      code: "ALLOCATION_EXCEEDS_AVAILABLE_INVENTORY",
      message: "Allocation quantity exceeds the remaining available inventory",
      field: "quantity",
    })
  }
}

export function assertAllocationFitsWorkOrderItemQuantity(input: {
  requiredQuantity: string | number
  existingAllocatedQuantity: string | number
  allocationQuantity: string | number
}) {
  const nextAllocatedQuantity =
    toAllocationNumber(input.existingAllocatedQuantity) + toAllocationNumber(input.allocationQuantity)

  if (nextAllocatedQuantity - toAllocationNumber(input.requiredQuantity) > 0.0001) {
    throw createWorkOrderAllocationDomainError({
      code: "ALLOCATION_EXCEEDS_ITEM_QUANTITY",
      message: "Allocation quantity exceeds the material item quantity",
      field: "quantity",
    })
  }
}
