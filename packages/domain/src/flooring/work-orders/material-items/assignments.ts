export type AssignmentQuantityRow = {
  quantity: string
  stockUnitAbbrev: string | null
}

/**
 * Totals a work order material item's ASSIGNMENTS — Σ of its linked DEDUCTION
 * adjustments' quantity, with the stock-unit suffix taken from the first row
 * that carries one (rows under one material item share units).
 *
 * Callers pass DEDUCTION rows only: an "assignment" is a DEDUCTION adjustment
 * linked to a WOMI. INCREASE rows may also carry a WO link but are NOT
 * assignments, so they must be filtered out by the caller.
 *
 * Returns "" for quantity when nothing summable is present (caller renders its
 * own "—"). Trailing zeros/dot trimmed: "10.00"→"10", "10.50"→"10.5", "0.25" stays.
 */
export function sumAssignmentQuantities(
  rows: ReadonlyArray<AssignmentQuantityRow>,
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
