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
