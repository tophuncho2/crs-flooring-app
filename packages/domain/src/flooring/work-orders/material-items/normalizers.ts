import type { WorkOrderMaterialItemRow } from "./types.js"

type WorkOrderMaterialItemInput = {
  id: string
  productId: string
  product: { name: string }
  quantity: { toString(): string } | null
  unitId: string | null
  unit?: { name: string; abbreviation: string } | null
  sendUnitName: string | null
  sendUnitAbbrev: string | null
  notes: string | null
  sourceTemplateItemId: string | null
  createdAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

export function normalizeWorkOrderMaterialItem(
  item: WorkOrderMaterialItemInput,
): WorkOrderMaterialItemRow {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    quantity: item.quantity == null ? "" : item.quantity.toString(),
    unitId: item.unitId ?? "",
    // Unit display derives from the item's own unit FK join (UoM epic 2C); the
    // frozen snapshot strings are the transition fallback (Phase C drops them).
    sendUnitName: item.unit?.name ?? item.sendUnitName ?? "",
    sendUnitAbbrev: item.unit?.abbreviation ?? item.sendUnitAbbrev ?? "",
    notes: item.notes ?? "",
    sourceTemplateItemId: item.sourceTemplateItemId,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
    createdBy: item.createdBy ?? null,
    updatedBy: item.updatedBy ?? null,
  }
}

