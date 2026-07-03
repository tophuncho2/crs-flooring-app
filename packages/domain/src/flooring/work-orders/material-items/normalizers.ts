import type { WorkOrderMaterialItemRow } from "./types.js"

type WorkOrderMaterialItemInput = {
  id: string
  productId: string
  product: { name: string }
  quantity: { toString(): string } | null
  unitId: string | null
  unit?: { name: string; abbreviation: string } | null
  notes: string | null
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
    // Unit display derives solely from the item's own unit FK join (UoM epic 2C);
    // snapshot columns fully de-referenced (2D drops them).
    unitName: item.unit?.name ?? "",
    unitAbbrev: item.unit?.abbreviation ?? "",
    notes: item.notes ?? "",
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
    createdBy: item.createdBy ?? null,
    updatedBy: item.updatedBy ?? null,
  }
}

