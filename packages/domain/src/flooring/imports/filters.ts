// Imports list/page filters. Status dropped in the alteration sweep (there's no
// status column any more); warehouse + manufacturer remain as filter axes.

export type ImportPageFilterState = {
  warehouseId: string[]
  manufacturerId: string[]
}

function parseIdArray(value: unknown): string[] {
  const normalized = Array.isArray(value) ? value : [value]
  return Array.from(
    new Set(
      normalized
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0),
    ),
  )
}

export const parseImportWarehouseFilter = parseIdArray
export const parseImportManufacturerFilter = parseIdArray
