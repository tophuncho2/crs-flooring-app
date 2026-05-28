export type StagedInventoryFilterRow = {
  id: string
  importEntryId: string
  categoryFilterId: string | null
  categoryFilterName: string | null
  categoryFilterSlug: string | null
  productId: string
  productName: string
  categoryId: string
  categoryName: string
  categorySlug: string
  stockOrdered: string
  stockUnitName: string
  stockUnitAbbrev: string
  childRowCount: number
  startingStockSum: string
  remainingStock: string
  createdAt: string
  updatedAt: string
}

export type StagedInventoryFilterForm = {
  categoryFilterId: string | null
  productId: string
  stockOrdered: string
}

export const EMPTY_STAGED_INVENTORY_FILTER_FORM: StagedInventoryFilterForm = {
  categoryFilterId: null,
  productId: "",
  stockOrdered: "",
}

export function toStagedInventoryFilterForm(
  row: StagedInventoryFilterRow,
): StagedInventoryFilterForm {
  return {
    categoryFilterId: row.categoryFilterId,
    productId: row.productId,
    stockOrdered: row.stockOrdered,
  }
}

export function computeFilterRemainingStock(input: {
  stockOrdered: string
  childStartingStockSum: string
}): string {
  const ordered = Number(input.stockOrdered)
  const sum = Number(input.childStartingStockSum)
  if (!Number.isFinite(ordered) || !Number.isFinite(sum)) {
    return ""
  }
  return (ordered - sum).toFixed(2)
}
