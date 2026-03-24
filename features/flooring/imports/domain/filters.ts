export type ImportStatusFilter = "PENDING" | "FINAL"

export type ImportPageFilterState = {
  status: ImportStatusFilter[]
  warehouseId: string[]
}

export function parseImportStatusFilter(value: unknown): ImportStatusFilter[] {
  const normalizedValues = Array.isArray(value) ? value : [value]
  return Array.from(
    new Set(
      normalizedValues
        .map((entry) => String(entry ?? "").trim().toUpperCase())
        .filter((entry): entry is ImportStatusFilter => entry === "PENDING" || entry === "FINAL"),
    ),
  )
}

export function parseImportWarehouseFilter(value: unknown) {
  const normalizedValues = Array.isArray(value) ? value : [value]
  return Array.from(
    new Set(
      normalizedValues
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0),
    ),
  )
}
