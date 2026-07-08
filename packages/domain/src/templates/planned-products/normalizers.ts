import { normalizeMoneyAmount } from "../../shared/money.js"
import type { TemplatePlannedProductRow } from "./types.js"

type TemplatePlannedProductInput = {
  id: string
  productId: string
  product: { name: string; category?: { name: string } | null }
  quantity: { toString(): string } | null
  unitId: string | null
  unit?: { name: string; abbreviation: string } | null
  notes: string | null
  cost: { toString(): string } | null
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

export function normalizeTemplatePlannedProduct(item: TemplatePlannedProductInput): TemplatePlannedProductRow {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    categoryName: item.product.category?.name ?? "",
    quantity: item.quantity == null ? "" : item.quantity.toString(),
    unitId: item.unitId ?? "",
    // Unit display derives solely from the item's own unit FK join (UoM epic 2C);
    // snapshot columns fully de-referenced (2D drops them).
    unitName: item.unit?.name ?? "",
    unitAbbrev: item.unit?.abbreviation ?? "",
    notes: item.notes ?? "",
    // Normalize on read so the row always carries a canonical "X.XX" string.
    // Prisma's Decimal.toString() drops trailing zeros ("10"), but MoneyCell
    // pads local state to "10.00" on blur — without this the FE's itemsDiffer
    // would flag every saved row as still-dirty. Empty stays "".
    cost: item.cost == null ? "" : normalizeMoneyAmount(item.cost.toString()),
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
    updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
    createdBy: item.createdBy ?? null,
    updatedBy: item.updatedBy ?? null,
  }
}
