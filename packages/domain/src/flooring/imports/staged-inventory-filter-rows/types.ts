// Filter row — read + form shapes. A filter row sits between the
// parent FlooringImportEntry and its child staged inventory rows. It
// owns the product selection, optional category-filter pre-filter, and
// the `stockOrdered` budget the child rows draw down against.
//
// Snapshots: stockUnitName + stockUnitAbbrev are stamped from
// FlooringProduct at filter-row create time (same pattern WOMI uses for
// sendUnitName / sendUnitAbbrev). Child staged inv rows then snapshot
// those two columns from this filter row at create time.

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

// User-editable surface. stockUnitName / stockUnitAbbrev are
// parent-owned snapshots (sourced from FlooringProduct on create) and
// never appear on the form.
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

/**
 * Remaining stock under this filter row =
 *   stockOrdered − sum(child.startingStock).
 *
 * Negative values are returned as-is so the UI can render
 * over-allocations distinctly. Inputs are strings to match the
 * read-shape convention (data layer normalizes Decimal → string).
 * Returns "" when either input fails Number parsing.
 */
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
