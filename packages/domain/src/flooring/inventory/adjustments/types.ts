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
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  adjustmentType: FlooringInventoryAdjustmentType
  status: FlooringInventoryAdjustmentStatus
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
  // Category narrows via the live `product.categoryId` relation; product is a
  // direct `productId` match. Mirrors the inventory list chips.
  categoryId?: ReadonlyArray<string>
  productId?: ReadonlyArray<string>
  // Import-identity chips — these target the parent inventory row through the
  // `inventory` relation (the adjustment row carries no PO#/import# snapshot of
  // its own). "Show all adjustments of inventory rows from this PO#/import#."
  importNumber?: ReadonlyArray<string>
  purchaseOrderNumber?: ReadonlyArray<string>
  // Adjustment lifecycle status — a direct match on the adjustment's own enum.
  status?: ReadonlyArray<FlooringInventoryAdjustmentStatus>
  // Parent-inventory archive state, reached through the `inventory` relation
  // (`true` = archived only, `false` = active only, undefined = all).
  isArchived?: boolean
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
  categorySlug: string
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  inventoryNumber: string | null
  rollPrefix: string | null
  rollNumber: string | null
  dyeLot: string | null
  inventoryNote: string | null
  location: string | null
  productId: string
  warehouseId: string
}
