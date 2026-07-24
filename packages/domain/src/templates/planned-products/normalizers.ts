import { toIsoTimestamp } from "../../shared/date-format.js"
import { normalizeMoneyAmount } from "../../shared/money.js"
import { computeTemplatePlannedProductLineTotal } from "./math.js"
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
  taxed: boolean
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

export function normalizeTemplatePlannedProduct(item: TemplatePlannedProductInput): TemplatePlannedProductRow {
  const quantity = item.quantity == null ? "" : item.quantity.toString()
  // Live product cost (read-join). Normalize on read to a canonical "X.XX" so the
  // line total and any dirty-check compare against a stable string. "" = no cost.
  // This is the "cost" — the per-unit basis for the line total.
  const productCost = item.product.cost == null ? "" : normalizeMoneyAmount(item.product.cost.toString())
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
    taxed: item.taxed,
    productCost,
    // Line total = qty × cost, where cost is the live product cost.
    lineTotal: computeTemplatePlannedProductLineTotal({ quantity, cost: productCost }),
    createdAt: toIsoTimestamp(item.createdAt),
    updatedAt: toIsoTimestamp(item.updatedAt),
    createdBy: item.createdBy ?? null,
    updatedBy: item.updatedBy ?? null,
  }
}
