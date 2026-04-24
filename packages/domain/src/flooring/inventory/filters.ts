// Inventory list/page filters. Pending/final status is gone (staged rows own
// that concept now; live inventory is always live). Archive is the only
// lifecycle axis on real inventory — added as a filter.

export type InventoryFilterState = {
  warehouseId: string[]
  isArchived: boolean | null
}

export type InventoryPageFilterState = InventoryFilterState & {
  categoryId: string[]
  productId: string[]
}

type InventoryFilterableRow = {
  importEntryId?: string | null
  importWarehouseId?: string | null
  warehouseId?: string | null
  isArchived?: boolean
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

export function parseInventoryIdFilter(value: unknown): string[] {
  const normalizedValues = Array.isArray(value) ? value : [value]
  return Array.from(
    new Set(
      normalizedValues
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0),
    ),
  )
}

export const parseInventoryWarehouseFilter = parseInventoryIdFilter
export const parseInventoryCategoryFilter = parseInventoryIdFilter
export const parseInventoryProductFilter = parseInventoryIdFilter

export function parseInventoryArchivedFilter(value: unknown): boolean | null {
  if (value === "true" || value === true) return true
  if (value === "false" || value === false) return false
  return null
}

export function getEffectiveInventoryWarehouseId(row: InventoryFilterableRow) {
  return row.importWarehouseId?.trim() || row.warehouseId?.trim() || ""
}

export function matchesInventoryWarehouseFilter(
  row: InventoryFilterableRow,
  warehouseIds: string[] | string,
) {
  const normalizedWarehouseIds = coerceFilterArray<string>(warehouseIds)
  if (normalizedWarehouseIds.length === 0) return true
  return normalizedWarehouseIds.includes(getEffectiveInventoryWarehouseId(row))
}

export function matchesInventoryArchivedFilter(
  row: InventoryFilterableRow,
  filter: boolean | null,
) {
  if (filter === null) return true
  return Boolean(row.isArchived) === filter
}

export function filterInventoryRows<T extends InventoryFilterableRow>(
  rows: T[],
  filters: InventoryFilterState,
) {
  return rows.filter(
    (row) =>
      matchesInventoryWarehouseFilter(row, filters.warehouseId) &&
      matchesInventoryArchivedFilter(row, filters.isArchived),
  )
}
