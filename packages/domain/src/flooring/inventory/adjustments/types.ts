export type FlooringInventoryAdjustmentStatus = "PENDING" | "QUEUED" | "FINAL"

export type InventoryAdjustmentStatus = FlooringInventoryAdjustmentStatus

export type FlooringInventoryAdjustmentType = "INCREASE" | "DEDUCTION"

export type InventoryAdjustmentRow = {
  id: string
  adjustmentNumber: string
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
  quantity: string
  after: string | null
  coverage: string | null
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  itemCoverageUnitName: string | null
  itemCoverageUnitAbbrev: string | null
  adjustmentType: FlooringInventoryAdjustmentType
  status: FlooringInventoryAdjustmentStatus
  isFinal: boolean
  finalSequence: number | null
  isWaste: boolean
  notes: string
  createdAt: string
  updatedAt: string
}

export type InventoryAdjustmentPendingForm = {
  adjustmentType: FlooringInventoryAdjustmentType
  quantity: string
  isWaste: boolean
  notes: string
}

export type InventoryAdjustmentLinkUpdate = {
  workOrderId: string | null
  workOrderItemId: string | null
}

export type EnrichedInventoryAdjustmentRow = InventoryAdjustmentRow & {
  workOrderNumber: string | null
  workOrderItemProductLabel: string | null
  workOrderItemNotes: string | null
  warehouseName: string
}

export type EnrichedInventoryAdjustmentPage = {
  rows: EnrichedInventoryAdjustmentRow[]
  hasMore: boolean
}

export type InventoryAdjustmentListFilters = {
  warehouseId?: ReadonlyArray<string>
  // Per-field identity search — the four list-view search bars. Each is a
  // free-text ILIKE against its own frozen snapshot column
  // (`inventoryNumber`/`rollNumber`/`dyeLot`/`inventoryNote`); multiple set
  // fields AND together to narrow.
  invNumber?: string
  rollNumber?: string
  dyeLot?: string
  note?: string
}

export type InventoryAdjustmentParentContext = {
  inventoryId: string
  inventoryItem: string
  startingStock: string
  currentNetDeducted: string
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
  warehouseId: string
}
