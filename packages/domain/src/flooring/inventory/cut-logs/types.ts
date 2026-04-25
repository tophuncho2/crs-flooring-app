export const CUT_LOG_STATUS_VALUES = ["PENDING", "FINAL", "VOIDED"] as const
export type CutLogStatus = (typeof CUT_LOG_STATUS_VALUES)[number]

export type CutLogRow = {
  id: string
  inventoryId: string
  workOrderId: string | null
  workOrderItemId: string | null
  before: string
  cut: string
  after: string
  coverageCut: string
  status: CutLogStatus
  isWaste: boolean
  void: boolean
  cost: string
  freight: string
  notes: string
  createdAt: string
  updatedAt: string
}
