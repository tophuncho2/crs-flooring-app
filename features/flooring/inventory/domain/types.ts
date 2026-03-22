import type { EditableCutLog } from "@/features/flooring/shared/ui/record-items/cut-logs-editor"

export type CutLogRow = EditableCutLog & {
  inventoryId: string
  inventoryLabel: string
  itemNumber: string
}

export type InventoryRow = {
  id: string
  importEntryId: string
  importWarehouseId: string
  importNumber: string
  importTag: string
  importStatus: string
  importTransportType: string
  importWarehouseName: string
  productId: string
  productName: string
  stockUnit: string
  itemNumber: string
  dyeLot: string
  locationId: string
  locationCode: string
  warehouseId: string
  warehouseName: string
  sectionName: string
  stockCount: string
  cutTotal: string
  runningBalance: string
  cost: string
  freight: string
  notes: string
  createdAt: string
  updatedAt: string
  cutLogs: CutLogRow[]
}

export type LocationOption = {
  id: string
  warehouseId: string
  locationCode: string
  label: string
  sectionName?: string | null
  warehouseName?: string | null
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
