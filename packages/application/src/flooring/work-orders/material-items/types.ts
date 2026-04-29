import type {
  WorkOrderMaterialItemForm,
  WorkOrderMaterialItemRow,
  WorkOrderMaterialItemsDiff,
} from "@builders/domain"

export type CreateWorkOrderMaterialItemUseCaseInput = {
  workOrderId: string
  form: WorkOrderMaterialItemForm
}

export type UpdateWorkOrderMaterialItemUseCaseInput = {
  id: string
  form: WorkOrderMaterialItemForm
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
