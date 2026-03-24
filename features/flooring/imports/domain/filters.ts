export const ALL_IMPORT_STATUS_FILTER = "all" as const
export const ALL_IMPORT_WAREHOUSE_FILTER = "all" as const

export type ImportStatusFilter = "all" | "PENDING" | "FINAL"

export type ImportPageFilterState = {
  status: ImportStatusFilter
  warehouseId: string
}

export function parseImportStatusFilter(value: unknown): ImportStatusFilter {
  const normalized = String(value ?? "").trim().toUpperCase()

  if (normalized === "PENDING" || normalized === "FINAL") {
    return normalized
  }

  return ALL_IMPORT_STATUS_FILTER
}

export function parseImportWarehouseFilter(value: unknown) {
  const normalized = String(value ?? "").trim()
  return normalized && normalized !== ALL_IMPORT_WAREHOUSE_FILTER ? normalized : ALL_IMPORT_WAREHOUSE_FILTER
}
