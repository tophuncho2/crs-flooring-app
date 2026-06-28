export type WorkOrderMaterialItemRow = {
  id: string
  productId: string
  productName: string
  quantity: string
  sendUnitName: string
  sendUnitAbbrev: string
  notes: string
  sourceTemplateItemId: string | null
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
// to drift). The DB `@@unique([workOrderId, productId])` still blocks dupes.
export type WorkOrderMaterialItemCreateForm = {
  productId: string
  quantity: string
  notes: string
}

export type WorkOrderMaterialItemUpdateForm = {
  productId: string
  quantity: string
  notes: string
}
