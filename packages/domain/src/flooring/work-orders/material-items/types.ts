export type WorkOrderItemStatus = "IDLE" | "FINALIZING" | "FAILED"

export type WorkOrderMaterialItemRow = {
  id: string
  productId: string
  productName: string
  quantity: string
  sendUnitName: string
  sendUnitAbbrev: string
  notes: string
  status: WorkOrderItemStatus
  sourceTemplateItemId: string | null
  // True when the item has at least one inventory adjustment. Once true the
  // product is locked (the row can only be deleted); see
  // `isWorkOrderMaterialItemProductChangeBlocked`.
  hasInventoryAdjustments: boolean
  createdAt: string
}

// Create form carries `productId` — the user picks a product when they add a
// new material item. The update form carries it too: the product stays
// editable until the item has linked inventory adjustments, after which the
// change is rejected (see `isWorkOrderMaterialItemProductChangeBlocked`).
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

/**
 * Option-row shape for the async WOMI picker (adjustment-relink dropdown).
 * Includes the disambiguating fields the picker subtitle needs so two
 * WOMIs of the same product on one WO render distinctly.
 */
export type WorkOrderMaterialItemOption = {
  id: string
  productId: string
  productName: string
  quantity: string
  sendUnitAbbrev: string
  notes: string
}

export const EMPTY_WORK_ORDER_MATERIAL_ITEM_CREATE_FORM: WorkOrderMaterialItemCreateForm = {
  productId: "",
  quantity: "",
  notes: "",
}
