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
