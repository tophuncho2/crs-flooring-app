export const ALL_INVENTORY_STATUS_FILTER = "all" as const
export const ALL_INVENTORY_WAREHOUSE_FILTER = "all" as const
export const ALL_INVENTORY_CATEGORY_FILTER = "all" as const
export const ALL_INVENTORY_PRODUCT_FILTER = "all" as const

export type InventoryStatusFilter = "all" | "pending" | "final"

export type InventoryFilterState = {
  status: InventoryStatusFilter
  warehouseId: string
}

export type InventoryPageFilterState = InventoryFilterState & {
  categoryId: string
  productId: string
}

type InventoryFilterableRow = {
  importEntryId?: string | null
  importStatus: string
  importWarehouseId?: string | null
  warehouseId?: string | null
}

export function parseInventoryStatusFilter(value: unknown): InventoryStatusFilter {
  const normalized = String(value ?? "").trim().toLowerCase()

  if (normalized === "pending" || normalized === "final") {
    return normalized
  }

  return ALL_INVENTORY_STATUS_FILTER
}

export function parseInventoryWarehouseFilter(value: unknown) {
  const normalized = String(value ?? "").trim()
  return normalized && normalized !== ALL_INVENTORY_WAREHOUSE_FILTER ? normalized : ALL_INVENTORY_WAREHOUSE_FILTER
}

export function parseInventoryCategoryFilter(value: unknown) {
  const normalized = String(value ?? "").trim()
  return normalized && normalized !== ALL_INVENTORY_CATEGORY_FILTER ? normalized : ALL_INVENTORY_CATEGORY_FILTER
}

export function parseInventoryProductFilter(value: unknown) {
  const normalized = String(value ?? "").trim()
  return normalized && normalized !== ALL_INVENTORY_PRODUCT_FILTER ? normalized : ALL_INVENTORY_PRODUCT_FILTER
}

export function getEffectiveInventoryWarehouseId(row: InventoryFilterableRow) {
  return row.importWarehouseId?.trim() || row.warehouseId?.trim() || ""
}

export function isPendingInventoryRow(row: InventoryFilterableRow) {
  return Boolean(row.importEntryId) && row.importStatus === "PENDING"
}

export function canCreateInventoryCutLogs(row: InventoryFilterableRow) {
  return !isPendingInventoryRow(row)
}

export function getInventoryCutLogBlockedReason(row: InventoryFilterableRow) {
  return canCreateInventoryCutLogs(row)
    ? ""
    : "Pending import inventory cannot be cut until the import is marked Final."
}

export function matchesInventoryStatusFilter(row: InventoryFilterableRow, status: InventoryStatusFilter) {
  if (status === ALL_INVENTORY_STATUS_FILTER) {
    return true
  }

  if (status === "pending") {
    return isPendingInventoryRow(row)
  }

  return !isPendingInventoryRow(row)
}

export function matchesInventoryWarehouseFilter(row: InventoryFilterableRow, warehouseId: string) {
  if (!warehouseId || warehouseId === ALL_INVENTORY_WAREHOUSE_FILTER) {
    return true
  }

  return getEffectiveInventoryWarehouseId(row) === warehouseId
}

export function filterInventoryRows<T extends InventoryFilterableRow>(rows: T[], filters: InventoryFilterState) {
  return rows.filter((row) => (
    matchesInventoryStatusFilter(row, filters.status) &&
    matchesInventoryWarehouseFilter(row, filters.warehouseId)
  ))
}
