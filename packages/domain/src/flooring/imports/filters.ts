import { IMPORT_STATUS_VALUES, type ImportStatus } from "./types.js"

export type ImportStatusFilter = ImportStatus

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
        .filter((entry): entry is ImportStatusFilter =>
          IMPORT_STATUS_VALUES.includes(entry as ImportStatus),
        ),
    ),
  )
}

export function parseImportWarehouseFilter(value: unknown): string[] {
  const normalizedValues = Array.isArray(value) ? value : [value]
  return Array.from(
    new Set(
      normalizedValues
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0),
    ),
  )
}
