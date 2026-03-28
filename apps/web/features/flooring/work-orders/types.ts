import type { EditableMaterialItem } from "@/features/flooring/shared/line-items/material-items-editor"
import type { EditableServiceItem } from "@/features/flooring/shared/line-items/service-items-editor"
import type { WorkOrderExpenseSummary } from "./domain/expense-summary"
import type { WorkOrderPageFilterState } from "./domain/filters"
import type { EditableWorkOrderSalesRep, SalesRepContactOption, WorkOrderSalesRepDraft } from "./domain/sales-reps"

export type WorkOrderRow = {
  id: string
  workOrderNumber: string
  propertyId: string
  templateId: string
  propertyName: string
  propertyAddress: string
  warehouseId: string
  warehouseName: string
  status: string
  statusLabel: string
  isComplete: boolean
  hasShortage?: boolean
  vacancy: "VACANT" | "OCCUPIED" | null
  date: string | null
  unitText: string
  unitType: string
  customAddress: string
  instructions: string
  notes: string
  workOrderImageUrl: string
  itemsCount: number
  createdAt: string
  updatedAt: string
}

export type PropertyOption = {
  id: string
  name: string
  address: string
}

export type WarehouseOption = {
  id: string
  name: string
}

export type TemplateOption = {
  id: string
  propertyId: string
  label: string
}

export type DraftWorkOrder = {
  propertyId: string
  templateId: string
  warehouseId: string
  status: string
  isComplete: boolean
  vacancy: "VACANT" | "OCCUPIED" | ""
  date: string
  unitText: string
  customAddress: string
  instructions: string
  notes: string
  workOrderImageUrl: string
}

export type WorkOrderItemAllocationRow = {
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

export type InventoryAllocationOption = {
  id: string
  productId: string
  warehouseId: string
  warehouseName: string
  itemNumber: string
  dyeLot: string
  locationCode: string
  stockUnit: string
  stockCount: string
  cutTotal: number
  reservedStockCount: string
  availableToAllocate: number
  pricePerUnit: number
  label: string
}

export type WorkOrderAutoAllocationRun = {
  id: string
  workOrderId: string
  requestedByUserId: string
  sourceVersion: string
  idempotencyKey: string
  status: "REQUESTED" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED"
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

export type WorkOrderMaterialItem = EditableMaterialItem & {
  allocations: WorkOrderItemAllocationRow[]
  allocatedQuantity: number
  remainingQuantity: number
  materialExpense: number
  hasAllocationShortage: boolean
  changeOrderStatus: "SUFFICIENT" | "SHORTAGE"
}

export type WorkOrderDetail = Omit<WorkOrderRow, "itemsCount"> & {
  items: WorkOrderMaterialItem[]
  serviceItems: EditableServiceItem[]
  salesReps: EditableWorkOrderSalesRep[]
  capabilities?: {
    canWrite: boolean
    canDelete: boolean
    canAllocate: boolean
    canSyncTemplate: boolean
    canGenerateInvoice: boolean
  }
  summary: {
    materialItemsCount: number
    serviceItemsCount: number
    totalItemsCount: number
    materialTotal: number
    serviceTotal: number
    grandTotal: number
  }
  financialSummary: WorkOrderExpenseSummary
}

export type ServerPaginationState = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  previousPageHref: string
  nextPageHref: string
}

export type ServerTableState = {
  searchQuery: string
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
}

export type WorkOrderServerFilterState = WorkOrderPageFilterState

export type { EditableWorkOrderSalesRep, SalesRepContactOption, WorkOrderExpenseSummary, WorkOrderSalesRepDraft }
