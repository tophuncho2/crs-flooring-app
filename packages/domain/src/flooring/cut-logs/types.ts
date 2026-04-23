export const CUT_LOG_STATUS_VALUES = ["PENDING", "FINAL"] as const
export type CutLogStatus = (typeof CUT_LOG_STATUS_VALUES)[number]

export type CutLogRow = {
  id: string
  inventoryId: string
  workOrderId: string | null
  workOrderItemId: string | null
  before: string
  cut: string
  after: string
  status: CutLogStatus
  isWaste: boolean
  cost: string
  freight: string
  coverage: string
  notes: string
  createdAt: string
  updatedAt: string
}
