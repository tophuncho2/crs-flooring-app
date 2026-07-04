import type { SectionDiff } from "../../shared/section-diff.js"
import type {
  WorkOrderMaterialItemCreateForm,
  WorkOrderMaterialItemUpdateForm,
} from "./types.js"

export type WorkOrderMaterialItemDraft = {
  tempId: string
  form: WorkOrderMaterialItemCreateForm
}

export type WorkOrderMaterialItemUpdate = {
  id: string
  form: WorkOrderMaterialItemUpdateForm
}

export type WorkOrderMaterialItemDelete = {
  id: string
}

export type WorkOrderMaterialItemsDiff = SectionDiff<
  WorkOrderMaterialItemCreateForm,
  WorkOrderMaterialItemUpdateForm
>
