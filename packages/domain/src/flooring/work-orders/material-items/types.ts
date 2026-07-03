export type WorkOrderMaterialItemRow = {
  id: string
  productId: string
  productName: string
  quantity: string
  // Editable unit FK (UoM epic 2C) — seeded from the product on select, then
  // freely editable; sent in the diff. "" when no unit linked yet.
  unitId: string
  // Unit display derives solely from the item's own unit FK join; the frozen
  // snapshot columns that once backed this were dropped in the UoM epic.
  unitName: string
  unitAbbrev: string
  notes: string
  sourceTemplatePlannedProductId: string | null
  createdAt: string
  // Actor-email snapshots stamped on item write (createdBy + updatedBy on add,
  // updatedBy on edit). Null on historical rows. Carried on the row but not
  // surfaced in the section table — DB-only by design.
  createdBy: string | null
  updatedBy: string | null
}

// Create form carries `productId` — the user picks a product when they add a
// new material item. The update form carries it too; the product is freely
// editable (adjustments no longer link to a material item, so there is nothing
// to drift). The same product may appear multiple times — the old
// `@@unique([workOrderId, productId])` was intentionally dropped (do not re-add).
export type WorkOrderMaterialItemCreateForm = {
  productId: string
  // Editable unit FK (UoM epic 2C). "" disconnects the unit.
  unitId: string
  quantity: string
  notes: string
}

export type WorkOrderMaterialItemUpdateForm = {
  productId: string
  unitId: string
  quantity: string
  notes: string
}
