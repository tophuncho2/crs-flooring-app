import type { EditableMaterialItem } from "@/modules/shared/engines/record-view/contracts/material-item-contracts"
import type { EditableServiceItem } from "@/modules/shared/engines/record-view/contracts/service-item-contracts"
import type { SalesRepContactOption } from "@/modules/shared/engines/record-view/contracts/record-sales-reps"
import type { EditableTemplateSalesRep } from "./domain/sales-reps"
import type { TemplateExpenseSummary } from "./domain/expense-summary"

export type TemplateRow = {
  id: string
  templateNumber: string
  templateTag: string
  propertyId: string
  propertyName: string
  warehouseId: string
  warehouseName: string
  instructions: string
  templateNotes: string
  padProductId: string
  padTypeLabel: string
  itemsCount?: number
  createdAt: string
  updatedAt: string
}

export type TemplateDetail = TemplateRow & {
  items: EditableMaterialItem[]
  serviceItems: EditableServiceItem[]
  salesReps: EditableTemplateSalesRep[]
  summary: {
    materialItemsCount: number
    serviceItemsCount: number
    totalItemsCount: number
    materialTotal: number
    serviceTotal: number
    grandTotal: number
  }
  expenseSummary: TemplateExpenseSummary
}

export type PropertyOption = {
  id: string
  name: string
}

export type WarehouseOption = {
  id: string
  name: string
}

export type PadProductOption = {
  id: string
  label: string
}

export type DraftTemplate = {
  templateTag: string
  propertyId: string
  warehouseId: string
  instructions: string
  templateNotes: string
  padProductId: string
}

export type { EditableTemplateSalesRep, SalesRepContactOption, TemplateExpenseSummary }

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
