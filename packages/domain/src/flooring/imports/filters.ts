export type ImportPageFilterState = {
  warehouseId: string[]
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
