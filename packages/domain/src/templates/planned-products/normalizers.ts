import { normalizeMoneyAmount } from "../../shared/money.js"
import { computePlannedProductSubtotal, normalizeMarginPercent } from "./math.js"
import type { TemplatePlannedProductRow } from "./types.js"

type TemplatePlannedProductInput = {
  id: string
  productId: string
  // The product join now carries the live `cost` (a read-join) alongside name +
  // category — the planned product no longer stores its own cost.
  product: { name: string; cost?: { toString(): string } | null; category?: { name: string } | null }
  quantity: { toString(): string } | null
  unitId: string | null
  unit?: { name: string; abbreviation: string } | null
  notes: string | null
  estimatedGrossProfitMargin: { toString(): string } | null
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

export function normalizeTemplatePlannedProduct(item: TemplatePlannedProductInput): TemplatePlannedProductRow {
  const quantity = item.quantity == null ? "" : item.quantity.toString()
  // Live product cost (read-join). Normalize on read to a canonical "X.XX" so the
  // subtotal and any dirty-check compare against a stable string. "" = no cost.
  const productCost = item.product.cost == null ? "" : normalizeMoneyAmount(item.product.cost.toString())
  // Margin is the only stored pricing input. Normalize on read (Decimal.toString
  // drops trailing zeros) so the FE's itemsDiffer never flags a saved row dirty.
  const estimatedGrossProfitMargin =
    item.estimatedGrossProfitMargin == null ? "" : normalizeMarginPercent(item.estimatedGrossProfitMargin.toString())
  return {
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    categoryName: item.product.category?.name ?? "",
    quantity,
    unitId: item.unitId ?? "",
    // Unit display derives solely from the item's own unit FK join (UoM epic 2C);
    // snapshot columns fully de-referenced (2D drops them).
    unitName: item.unit?.name ?? "",
    unitAbbrev: item.unit?.abbreviation ?? "",
    notes: item.notes ?? "",
    productCost,
    estimatedGrossProfitMargin,
    // Derived from the live cost + margin — the single source of truth in math.ts.
    subtotal: computePlannedProductSubtotal({ quantity, cost: productCost, margin: estimatedGrossProfitMargin }),
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
    updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
    createdBy: item.createdBy ?? null,
    updatedBy: item.updatedBy ?? null,
  }
}
