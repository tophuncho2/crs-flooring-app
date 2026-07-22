import { toIsoTimestamp } from "../../shared/date-format.js"
import { normalizeMoneyAmount } from "../../shared/money.js"
// The job-costing line total is generic (qty × bidCost + tax + freight) — reuse
// the planned-product function verbatim rather than forking a second copy. The
// only divergence is that a service item's bidCost is a stored column, not a live
// product join.
import { computeTemplatePlannedProductLineTotal } from "../planned-products/math.js"
import type { TemplateServiceItemRow } from "./types.js"

type TemplateServiceItemInput = {
  id: string
  itemType: string | null
  itemName: string | null
  quantity: { toString(): string } | null
  unitId: string | null
  unit?: { name: string; abbreviation: string } | null
  // Persisted job-costing money columns (bidCost stored here, not a join).
  bidCost: { toString(): string } | null
  tax: { toString(): string } | null
  freight: { toString(): string } | null
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

export function normalizeTemplateServiceItem(item: TemplateServiceItemInput): TemplateServiceItemRow {
  const quantity = item.quantity == null ? "" : item.quantity.toString()
  const bidCost = normalizeMoneyColumn(item.bidCost)
  const tax = normalizeMoneyColumn(item.tax)
  const freight = normalizeMoneyColumn(item.freight)
  return {
    id: item.id,
    itemType: item.itemType ?? "",
    itemName: item.itemName ?? "",
    quantity,
    unitId: item.unitId ?? "",
    unitName: item.unit?.name ?? "",
    unitAbbrev: item.unit?.abbreviation ?? "",
    bidCost,
    tax,
    freight,
    // Line total = qty × bidCost + tax + freight, using the manual bid cost.
    lineTotal: computeTemplatePlannedProductLineTotal({ quantity, bidCost, tax, freight }),
    createdAt: toIsoTimestamp(item.createdAt),
    updatedAt: toIsoTimestamp(item.updatedAt),
    createdBy: item.createdBy ?? null,
    updatedBy: item.updatedBy ?? null,
  }
}
