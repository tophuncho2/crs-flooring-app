export type InventoryStatusFilter = "pending" | "final"

export type InventoryFilterState = {
  status: InventoryStatusFilter[]
  warehouseId: string[]
}

export type InventoryPageFilterState = InventoryFilterState & {
  categoryId: string[]
  productId: string[]
}

type InventoryFilterableRow = {
  importEntryId?: string | null
  importStatus: string
  importWarehouseId?: string | null
  warehouseId?: string | null
}

function coerceFilterArray<T extends string>(value: T[] | T | string[] | string | undefined) {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is T => typeof entry === "string" && entry.length > 0)
  }

  if (typeof value === "string" && value.length > 0) {
    return [value as T]
  }

  return []
}

export function parseInventoryStatusFilter(value: unknown): InventoryStatusFilter[] {
  const normalizedValues = Array.isArray(value) ? value : [value]
  const requestedValues = normalizedValues
    .map((entry) => String(entry ?? "").trim().toLowerCase())
    .filter((entry): entry is InventoryStatusFilter => entry === "pending" || entry === "final")

  return Array.from(new Set(requestedValues))
}

export function parseInventoryWarehouseFilter(value: unknown): string[] {
  const normalizedValues = Array.isArray(value) ? value : [value]
  return Array.from(
    new Set(
      normalizedValues
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0),
    ),
  )
}

export function parseInventoryCategoryFilter(value: unknown): string[] {
  const normalizedValues = Array.isArray(value) ? value : [value]
  return Array.from(
    new Set(
      normalizedValues
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0),
    ),
  )
}

export function parseInventoryProductFilter(value: unknown): string[] {
  const normalizedValues = Array.isArray(value) ? value : [value]
  return Array.from(
    new Set(
      normalizedValues
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0),
    ),
  )
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

export function matchesInventoryStatusFilter(row: InventoryFilterableRow, statuses: InventoryStatusFilter[] | InventoryStatusFilter) {
  const normalizedStatuses = coerceFilterArray<InventoryStatusFilter>(statuses)
  if (normalizedStatuses.length === 0) {
    return true
  }

  return normalizedStatuses.some((status) => {
    if (status === "pending") {
      return isPendingInventoryRow(row)
    }

    return !isPendingInventoryRow(row)
  })
}

export function matchesInventoryWarehouseFilter(row: InventoryFilterableRow, warehouseIds: string[] | string) {
  const normalizedWarehouseIds = coerceFilterArray<string>(warehouseIds)
  if (normalizedWarehouseIds.length === 0) {
    return true
  }

  return normalizedWarehouseIds.includes(getEffectiveInventoryWarehouseId(row))
}

export function filterInventoryRows<T extends InventoryFilterableRow>(rows: T[], filters: InventoryFilterState) {
  return rows.filter((row) => (
    matchesInventoryStatusFilter(row, filters.status) &&
    matchesInventoryWarehouseFilter(row, filters.warehouseId)
  ))
}
