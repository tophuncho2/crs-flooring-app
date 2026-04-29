import type { TemplateMaterialItemRow } from "./types.js"

type TemplateMaterialItemInput = {
  id: string
  productId: string
  product: { name: string }
  quantity: { toString(): string }
  notes: string | null
  createdAt: Date | string
}

export function normalizeTemplateMaterialItem(item: TemplateMaterialItemInput): TemplateMaterialItemRow {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    quantity: item.quantity.toString(),
    notes: item.notes ?? "",
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
  }
}
