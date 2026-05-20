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
  createdAt: string
}

// Create form carries `productId` — the user picks a product when they add a
// new material item. Update form omits it: product is immutable post-create
// (defense in depth — type system, API validator carve-out, and the
// `isWorkOrderMaterialItemProductChangeBlocked` predicate all agree).
export type WorkOrderMaterialItemCreateForm = {
  productId: string
  quantity: string
  notes: string
}

export type WorkOrderMaterialItemUpdateForm = Omit<
  WorkOrderMaterialItemCreateForm,
  "productId"
>

/**
 * Option-row shape for the async WOMI picker (cut-log relink dropdown).
 * Includes the disambiguating fields the picker subtitle needs so two
 * WOMIs of the same product on one WO render distinctly.
 */
export type WorkOrderMaterialItemOption = {
  id: string
  productId: string
  productName: string
  quantity: string
  sendUnitAbbrev: string
}

export const EMPTY_WORK_ORDER_MATERIAL_ITEM_CREATE_FORM: WorkOrderMaterialItemCreateForm = {
  productId: "",
  quantity: "",
  notes: "",
}
