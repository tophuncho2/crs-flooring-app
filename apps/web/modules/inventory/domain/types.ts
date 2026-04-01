import type { EditableCutLog } from "@/modules/shared/engines/record-view/line-items/cut-logs-editor"
import type { InventoryPageFilterState } from "@/modules/inventory/domain/filters"

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
  reservedStockCount: string
  totalAllocated: string
  unreservedTotal: string
  availableToAllocate: string
  runningBalance: string
  cost: string
  freight: string
  pricePerUnit: string
  notes: string
  createdAt: string
  updatedAt: string
  cutLogs: CutLogRow[]
  canCreateCutLogs: boolean
  cutLogBlockedReason: string
}

export type LocationOption = {
  id: string
  warehouseId: string
  locationCode: string
  label: string
  sectionName?: string | null
  warehouseName?: string | null
}

export type InventoryWarehouseOption = {
  id: string
  name: string
}

export type InventoryPrimaryForm = {
  locationId: string
  itemNumber: string
  dyeLot: string
  cost: string
  freight: string
  notes: string
}

export type InventoryCategoryOption = {
  id: string
  name: string
}

export type InventoryProductOption = {
  id: string
  label: string
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

export type InventoryServerFilterState = InventoryPageFilterState

export function toInventoryPrimaryForm(record: InventoryRow): InventoryPrimaryForm {
  return {
    locationId: record.locationId,
    itemNumber: record.itemNumber,
    dyeLot: record.dyeLot,
    cost: record.cost,
    freight: record.freight,
    notes: record.notes,
  }
}

export function validateInventoryPrimaryForm(input: InventoryPrimaryForm) {
  if (!input.locationId.trim()) return "Select a location before saving inventory"
  if (!input.itemNumber.trim()) return "Item # is required"
  return ""
}
