import type { WorkOrderMaterialItemForm } from "./types.js"

export type WorkOrderMaterialItemDraft = {
  tempId: string
  form: WorkOrderMaterialItemForm
}

export type WorkOrderMaterialItemUpdate = {
  id: string
  form: WorkOrderMaterialItemForm
}

export type WorkOrderMaterialItemDelete = {
  id: string
}

export type WorkOrderMaterialItemsDiff = {
  added: WorkOrderMaterialItemDraft[]
  modified: WorkOrderMaterialItemUpdate[]
  deleted: WorkOrderMaterialItemDelete[]
}
