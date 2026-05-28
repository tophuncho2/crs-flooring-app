export type FlooringCutLogStatus = "PENDING" | "QUEUED" | "FINAL" | "VOID"

export type CutLogStatus = FlooringCutLogStatus

export type CutLogRow = {
  id: string
  cutLogNumber: string
  inventoryId: string
  inventoryItem: string
  inventoryNumber: string | null
  rollPrefix: string | null
  rollNumber: string | null
  dyeLot: string | null
  inventoryNote: string | null
  location: string | null
  categorySlug: string
  productId: string
  productName: string
  warehouseId: string
  workOrderId: string | null
  workOrderItemId: string | null
  before: string | null
  cut: string
  after: string | null
  coverageCut: string | null
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  itemCoverageUnitName: string | null
  itemCoverageUnitAbbrev: string | null
  status: FlooringCutLogStatus
  isFinal: boolean
  finalCutSequence: number | null
  isWaste: boolean
  void: boolean
  notes: string
  createdAt: string
  updatedAt: string
}

export type CutLogPendingForm = {
  cut: string
  isWaste: boolean
  notes: string
}

export type CutLogLinkUpdate = {
  workOrderId: string | null
  workOrderItemId: string | null
}

export type InventoryCutLogRow = CutLogRow & {
  workOrderNumber: string | null
  workOrderItemProductLabel: string | null
  workOrderItemNotes: string | null
  warehouseName: string
}

export type InventoryCutLogPage = {
  rows: InventoryCutLogRow[]
  hasMore: boolean
}

export type CutLogListFilters = {
  warehouseId?: ReadonlyArray<string>
}

export type CutLogParentContext = {
  inventoryId: string
  inventoryItem: string
  startingStock: string
  currentTotalCutSum: string
  coveragePerUnit: string | null
  categorySlug: string
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  itemCoverageUnitName: string | null
  itemCoverageUnitAbbrev: string | null
  inventoryNumber: string | null
  rollPrefix: string | null
  rollNumber: string | null
  dyeLot: string | null
  inventoryNote: string | null
  location: string | null
  productId: string
  productName: string
  warehouseId: string
}
