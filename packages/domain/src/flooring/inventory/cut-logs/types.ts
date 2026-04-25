import type { FlooringCutLogStatus } from "@prisma/client"

// Re-exported so consumers don't have to reach into Prisma directly.
export type { FlooringCutLogStatus } from "@prisma/client"

// Backward-compat alias kept so existing call sites that imported
// `CutLogStatus` from this module continue to work without churn.
export type CutLogStatus = FlooringCutLogStatus

export type CutLogRow = {
  id: string
  inventoryId: string
  workOrderId: string | null
  workOrderItemId: string | null
  before: string
  cut: string
  after: string
  coverageCut: string
  status: FlooringCutLogStatus
  isWaste: boolean
  void: boolean
  cost: string
  freight: string
  notes: string
  createdAt: string
  updatedAt: string
}
