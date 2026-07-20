import type { EnrichedInventoryAdjustmentRow } from "../../../src/inventory/adjustments/types.js"
import type { InventoryDetail } from "../../../src/inventory/types.js"

// Em-dash placeholder emitted by `escapeOrEmpty` for blank values. Named so
// assertions don't depend on pasting the exact U+2014 glyph.
export const EMPTY_CELL = '<span class="empty-cell">—</span>'

const BASE_ADJUSTMENT: EnrichedInventoryAdjustmentRow = {
  id: "adj-1",
  adjustmentNumber: "ADJ-1",
  inventoryId: "inv-1",
  inventoryNumber: "INV-1042",
  rollPrefix: "ROLL#",
  rollNumber: "88",
  dyeLot: "DL-2231",
  inventoryNote: "",
  location: "Bay 3",
  area: "Unit 12B",
  productId: "prod-1",
  productName: "Mohawk Berber - Oatmeal",
  warehouseId: "wh-1",
  workOrderId: "wo-1",
  before: "500",
  quantity: "88",
  after: "412",
  cost: null,
  freight: null,
  unitId: "unit-1",
  unitName: "Square Yard",
  unitAbbrev: "SY",
  adjustmentType: "DEDUCTION",
  isWaste: false,
  internalNotes: "",
  color: "SLATE",
  createdAt: "2026-07-01T12:00:00.000Z",
  updatedAt: "2026-07-01T12:00:00.000Z",
  createdBy: "ops@crs.test",
  updatedBy: "ops@crs.test",
  workOrderNumber: "WO-1001",
  warehouseName: "Main",
}

/** A fully-populated, valid enriched adjustment row; keys shallow-overridden. */
export function makeAdjustment(
  overrides: Partial<EnrichedInventoryAdjustmentRow> = {},
): EnrichedInventoryAdjustmentRow {
  return { ...BASE_ADJUSTMENT, ...overrides }
}

const BASE_INVENTORY: InventoryDetail = {
  id: "inv-1",
  inventoryNumber: "INV-1042",
  importEntryId: "imp-1",
  importNumber: 7,
  purchaseOrderNumber: "PO-55",
  productId: "prod-1",
  productName: "Mohawk Berber - Oatmeal",
  productStyle: "Berber",
  productColor: "Oatmeal",
  categoryId: "cat-1",
  unitId: "unit-1",
  unitName: "Square Yard",
  unitAbbrev: "SY",
  rollPrefix: "ROLL#",
  rollNumber: "88",
  dyeLot: "DL-2231",
  warehouseId: "wh-1",
  warehouseName: "Main",
  location: "Bay 3",
  startingStock: "500",
  cost: "12.50",
  freight: "1.25",
  netDeducted: "88",
  stockBalance: "412",
  isArchived: false,
  note: "First shipment",
  internalNotes: "",
  color: "SLATE",
  createdAt: "2026-06-30T12:00:00.000Z",
  updatedAt: "2026-07-01T12:00:00.000Z",
  createdBy: "ops@crs.test",
  updatedBy: "ops@crs.test",
  inventoryAdjustments: [],
  previousInventory: null,
  nextInventory: null,
}

/**
 * A fully-populated, valid `InventoryDetail` for the file-generation tests. Top-level
 * keys are shallow-overridden; `inventoryAdjustments` defaults to `[]`.
 */
export function makeInventoryDetail(overrides: Partial<InventoryDetail> = {}): InventoryDetail {
  return { ...BASE_INVENTORY, ...overrides }
}
