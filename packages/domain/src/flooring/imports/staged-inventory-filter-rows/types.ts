export type StagedInventoryFilterRow = {
  id: string
  importEntryId: string
  categoryFilterId: string | null
  categoryFilterName: string | null
  categoryFilterSlug: string | null
  productId: string
  productName: string
  categoryId: string
  stockOrdered: string
  // Canonical unit FK (UoM epic 2B) — editable, re-seeded from the product on
  // product-change (mirrors the material-item unit). "" when unset. Display
  // derives from the join.
  unitId: string
  unitName: string
  unitAbbrev: string
  startingStockSum: string
  remainingStock: string
  createdAt: string
  updatedAt: string
}

export type StagedInventoryFilterForm = {
  categoryFilterId: string | null
  productId: string
  unitId: string
  stockOrdered: string
}

export const EMPTY_STAGED_INVENTORY_FILTER_FORM: StagedInventoryFilterForm = {
  categoryFilterId: null,
  productId: "",
  unitId: "",
  stockOrdered: "",
}

export function toStagedInventoryFilterForm(
  row: StagedInventoryFilterRow,
): StagedInventoryFilterForm {
  return {
    categoryFilterId: row.categoryFilterId,
    productId: row.productId,
    unitId: row.unitId,
    stockOrdered: row.stockOrdered,
  }
}

export function computeFilterRemainingStock(input: {
  stockOrdered: string
  childStartingStockSum: string
}): string {
  // Blank stock ordered means "not yet ordered" — there is nothing to
  // compute remaining against, so remaining is blank too. (Guard before
  // Number(), since Number("") is 0 and would compute a false remaining.)
  if (input.stockOrdered.trim() === "") {
    return ""
  }
  const ordered = Number(input.stockOrdered)
  const sum = Number(input.childStartingStockSum)
  if (!Number.isFinite(ordered) || !Number.isFinite(sum)) {
    return ""
  }
  return (ordered - sum).toFixed(2)
}
