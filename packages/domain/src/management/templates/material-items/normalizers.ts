import type { TemplateMaterialItemRow } from "./types.js"

type TemplateMaterialItemInput = {
  id: string
  productId: string
  product: { name: string }
  quantity: { toString(): string } | null
  sendUnitName: string | null
  sendUnitAbbrev: string | null
  notes: string | null
  createdAt: Date | string
}

export function normalizeTemplateMaterialItem(item: TemplateMaterialItemInput): TemplateMaterialItemRow {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    quantity: item.quantity == null ? "" : item.quantity.toString(),
    sendUnitName: item.sendUnitName ?? "",
    sendUnitAbbrev: item.sendUnitAbbrev ?? "",
    notes: item.notes ?? "",
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
  }
}
