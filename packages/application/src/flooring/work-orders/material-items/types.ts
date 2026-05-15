import type {
  WorkOrderMaterialItemCreateForm,
  WorkOrderMaterialItemRow,
  WorkOrderMaterialItemUpdateForm,
  WorkOrderMaterialItemsDiff,
} from "@builders/domain"

export type CreateWorkOrderMaterialItemUseCaseInput = {
  workOrderId: string
  form: WorkOrderMaterialItemCreateForm
}

export type UpdateWorkOrderMaterialItemUseCaseInput = {
  id: string
  form: WorkOrderMaterialItemUpdateForm
}

export type DeleteWorkOrderMaterialItemUseCaseInput = {
  id: string
}

export type SaveWorkOrderMaterialItemsSectionUseCaseInput = {
  workOrderId: string
  diff: WorkOrderMaterialItemsDiff
}

export type WorkOrderMaterialItemUseCaseResult = WorkOrderMaterialItemRow

export type SaveWorkOrderMaterialItemsSectionUseCaseResult = {
  items: WorkOrderMaterialItemRow[]
  tempIdMap: Record<string, string>
}
