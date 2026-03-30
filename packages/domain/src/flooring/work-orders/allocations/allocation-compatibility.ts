import { createWorkOrderAllocationDomainError } from "./errors.js"

export function assertWorkOrderAllocationCompatibility(input: {
  itemProductId: string
  workOrderWarehouseId: string | null
  inventoryProductId: string
  inventoryWarehouseId: string | null
}) {
  if (!input.workOrderWarehouseId) {
    throw createWorkOrderAllocationDomainError({
      code: "WORK_ORDER_WAREHOUSE_REQUIRED",
      message: "Work order must have a warehouse before allocations can be created",
      field: "warehouseId",
    })
  }

  if (input.itemProductId !== input.inventoryProductId) {
    throw createWorkOrderAllocationDomainError({
      code: "ALLOCATION_PRODUCT_MISMATCH",
      message: "Inventory row must match the material item product",
      field: "inventoryId",
    })
  }

  if (!input.inventoryWarehouseId || input.inventoryWarehouseId !== input.workOrderWarehouseId) {
    throw createWorkOrderAllocationDomainError({
      code: "ALLOCATION_WAREHOUSE_MISMATCH",
      message: "Inventory row must belong to the work order warehouse",
      field: "inventoryId",
    })
  }
}
