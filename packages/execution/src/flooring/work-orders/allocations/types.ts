export type WorkOrderItemAllocationRecord = {
  id: string
  workOrderItemId: string
  inventoryId: string
  quantity: string
  cutSize: string
  unitCost: string
  totalCost: number
  method: "MANUAL" | "AUTO"
  notes: string
  createdAt: string
  updatedAt: string
  inventory: {
    itemNumber: string
    dyeLot: string
    locationCode: string
    warehouseName: string
    stockUnit: string
  }
}

export type InventoryAllocationOptionRecord = {
  id: string
  productId: string
  warehouseId: string
  warehouseName: string
  fifoReceivedAt: string
  itemNumber: string
  dyeLot: string
  locationCode: string
  stockUnit: string
  stockCount: string
  cutTotal: number
  reservedStockCount: string
  totalAllocated: string
  unreservedTotal: string
  availableToAllocate: number
  pricePerUnit: number
  label: string
}

export type WorkOrderAllocationRunRecord = {
  id: string
  workOrderId: string
  requestedByUserId: string
  sourceVersion: string
  idempotencyKey: string
  status: "REQUESTED" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "SUPERSEDED"
  requestId: string | null
  queueJobId: string | null
  requestedAt: string
  queuedAt: string | null
  startedAt: string | null
  completedAt: string | null
  failedAt: string | null
  failureCode: string | null
  failureMessage: string | null
  allocatedRowCount: number
  shortageCount: number
}
