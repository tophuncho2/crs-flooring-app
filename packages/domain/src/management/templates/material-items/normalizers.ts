import type { TemplateMaterialItemRow } from "./types.js"

type TemplateMaterialItemInput = {
  id: string
  productId: string
  product: { name: string; category?: { name: string } | null }
  quantity: { toString(): string } | null
  unitId: string | null
  unit?: { name: string; abbreviation: string } | null
  sendUnitName: string | null
  sendUnitAbbrev: string | null
  notes: string | null
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

export function normalizeTemplateMaterialItem(item: TemplateMaterialItemInput): TemplateMaterialItemRow {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    categoryName: item.product.category?.name ?? "",
    quantity: item.quantity == null ? "" : item.quantity.toString(),
    unitId: item.unitId ?? "",
    // Unit display derives from the item's own unit FK join (UoM epic 2C); the
    // frozen snapshot strings are the transition fallback (Phase C drops them).
    sendUnitName: item.unit?.name ?? item.sendUnitName ?? "",
    sendUnitAbbrev: item.unit?.abbreviation ?? item.sendUnitAbbrev ?? "",
    notes: item.notes ?? "",
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
    updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
    createdBy: item.createdBy ?? null,
    updatedBy: item.updatedBy ?? null,
  }
}
