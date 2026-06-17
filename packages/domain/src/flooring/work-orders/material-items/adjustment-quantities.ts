export type AdjustmentQuantityRow = {
  quantity: string
  stockUnitAbbrev: string | null
}

/**
 * Totals a set of adjustment rows — Σ of their `quantity`, with the stock-unit
 * suffix taken from the first row that carries one (rows of one product share
 * units). Direction-neutral: the caller filters to the rows it wants summed.
 * The WO Adjustments grid calls it twice per product — once over the DEDUCTION
 * rows (outflow subtotal) and once over the INCREASE rows (inflow subtotal); the
 * print files call it over a product group's DEDUCTION rows only.
 *
 * Returns "" for quantity when nothing summable is present (caller renders its
 * own "—"). Trailing zeros/dot trimmed: "10.00"→"10", "10.50"→"10.5", "0.25" stays.
 */
export function sumAdjustmentQuantities(
  rows: ReadonlyArray<AdjustmentQuantityRow>,
): { quantity: string; stockUnitAbbrev: string } {
  const present = rows.map((r) => r.quantity).filter((v) => v !== "")
  const quantity =
    present.length === 0
      ? ""
      : present.reduce((sum, v) => sum + (Number(v) || 0), 0).toFixed(2).replace(/\.?0+$/, "")
  const stockUnitAbbrev =
    rows.find((r) => r.stockUnitAbbrev != null && r.stockUnitAbbrev !== "")?.stockUnitAbbrev ?? ""
  return { quantity, stockUnitAbbrev }
}
