import type { EditableMaterialItem } from "@/features/flooring/shared/ui/record-items/material-items-editor"
import type { EditableServiceItem } from "@/features/flooring/shared/ui/record-items/service-items-editor"
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
  unitType: string
  customAddress: string
  instructions: string
  notes: string
  workOrderImageUrl: string
}

export type WorkOrderDetail = Omit<WorkOrderRow, "itemsCount"> & {
  items: EditableMaterialItem[]
  serviceItems: EditableServiceItem[]
  salesReps: EditableWorkOrderSalesRep[]
  summary: {
    materialItemsCount: number
    serviceItemsCount: number
    totalItemsCount: number
    materialTotal: number
    serviceTotal: number
    grandTotal: number
  }
  expenseSummary: WorkOrderExpenseSummary
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
