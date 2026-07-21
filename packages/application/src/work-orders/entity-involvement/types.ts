import type {
  WorkOrderEntityInvolvementRow,
  WorkOrderEntityInvolvementsDiff,
} from "@builders/domain"

export type SaveWorkOrderEntityInvolvementSectionUseCaseInput = {
  workOrderId: string
  diff: WorkOrderEntityInvolvementsDiff
}

export type SaveWorkOrderEntityInvolvementSectionUseCaseResult = {
  entityInvolvements: WorkOrderEntityInvolvementRow[]
  tempIdMap: Record<string, string>
}
