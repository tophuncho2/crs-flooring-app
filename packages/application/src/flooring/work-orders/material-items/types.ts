import type {
  WorkOrderMaterialItemRow,
  WorkOrderMaterialItemsDiff,
} from "@builders/domain"

export type SaveWorkOrderMaterialItemsSectionUseCaseInput = {
  workOrderId: string
  diff: WorkOrderMaterialItemsDiff
}

export type SaveWorkOrderMaterialItemsSectionUseCaseResult = {
  items: WorkOrderMaterialItemRow[]
  tempIdMap: Record<string, string>
}
