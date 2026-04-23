import type { TemplateMaterialItemRow } from "./types.js"

type TemplateMaterialItemInput = {
  id: string
  productId: string
  product: { name: string }
  quantity: { toString(): string }
  unitPrice: { toString(): string }
  notes: string | null
  createdAt: Date | string
}

export function normalizeTemplateMaterialItem(item: TemplateMaterialItemInput): TemplateMaterialItemRow {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice.toString(),
    notes: item.notes ?? "",
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
  }
}
