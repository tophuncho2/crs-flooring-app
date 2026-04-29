export type WorkOrderItemStatus = "IDLE" | "SAVING_CUTS" | "FINALIZING" | "FAILED"

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

export type WorkOrderMaterialItemForm = {
  productId: string
  quantity: string
  notes: string
}

export const EMPTY_WORK_ORDER_MATERIAL_ITEM_FORM: WorkOrderMaterialItemForm = {
  productId: "",
  quantity: "",
  notes: "",
}
