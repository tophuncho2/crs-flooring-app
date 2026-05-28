import type { CutLogRecord } from "@builders/db"

export type CutLogMutationScope =
  | { kind: "work-order"; workOrderId: string }
  | { kind: "inventory"; inventoryId: string }

export type CreatePendingCutLogInput = {
  workOrderId: string
  workOrderItemId: string
  inventoryId: string
  cut: string
  isWaste: boolean
  notes: string
}

export type UpdatePendingCutLogPatch = {
  cut?: string
  isWaste?: boolean
  notes?: string
  link?: { workOrderId: string | null; workOrderItemId: string | null }
}

export type UpdatePendingCutLogInput = {
  scope: CutLogMutationScope
  cutLogId: string
  expectedUpdatedAt: string
  patch: UpdatePendingCutLogPatch
}

export type DeletePendingCutLogInput = {
  scope: CutLogMutationScope
  cutLogId: string
  expectedUpdatedAt: string
}

export type FinalizeCutLogInput = {
  scope: CutLogMutationScope
  cutLogId: string
}

export type CutLogMutationResult = {
  cutLog: CutLogRecord
  inventoryId: string
  totalCutSum: string
}

export type DeleteCutLogResult = {
  deletedId: string
  inventoryId: string
  totalCutSum: string
}

export type FinalizeCutLogResult = {
  cutLog: CutLogRecord
}
