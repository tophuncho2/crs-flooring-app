import { toIsoTimestamp } from "../../shared/date-format.js"
import { normalizeMoneyAmount } from "../../shared/money.js"
import {
  computeTemplatePlannedProductLineMargin,
  computeTemplatePlannedProductLineProfit,
  computeTemplatePlannedProductLineTotal,
} from "./math.js"
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
  // Persisted job-costing money columns.
  unitPrice: { toString(): string } | null
  tax: { toString(): string } | null
  freight: { toString(): string } | null
  notes: string | null
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

// Normalize a persisted money column on read to a canonical "X.XX" ("" when
// NULL) so dirty-checks compare stable strings (no trailing-zero false-dirty).
function normalizeMoneyColumn(value: { toString(): string } | null): string {
  return value == null ? "" : normalizeMoneyAmount(value.toString())
}

export function normalizeTemplatePlannedProduct(item: TemplatePlannedProductInput): TemplatePlannedProductRow {
  const quantity = item.quantity == null ? "" : item.quantity.toString()
  // Live product cost (read-join). Normalize on read to a canonical "X.XX" so the
  // subtotal and any dirty-check compare against a stable string. "" = no cost.
  const productCost = item.product.cost == null ? "" : normalizeMoneyAmount(item.product.cost.toString())
  const unitPrice = normalizeMoneyColumn(item.unitPrice)
  const tax = normalizeMoneyColumn(item.tax)
  const freight = normalizeMoneyColumn(item.freight)
  // Bid cost = the live product cost (read-join), fed to the derived profit/margin.
  const profitInputs = { quantity, unitPrice, tax, freight, bidCost: productCost }
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
    unitPrice,
    tax,
    freight,
    lineTotal: computeTemplatePlannedProductLineTotal({ quantity, unitPrice, tax, freight }),
    lineProfit: computeTemplatePlannedProductLineProfit(profitInputs),
    lineMargin: computeTemplatePlannedProductLineMargin(profitInputs),
    createdAt: toIsoTimestamp(item.createdAt),
    updatedAt: toIsoTimestamp(item.updatedAt),
    createdBy: item.createdBy ?? null,
    updatedBy: item.updatedBy ?? null,
  }
}
