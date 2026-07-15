import type { PaletteColor } from "../../shared/palette.js"
import type { ProductSearchInput } from "../../products/list-filters.js"

export type FlooringInventoryAdjustmentType = "INCREASE" | "DEDUCTION"

export type InventoryAdjustmentRow = {
  id: string
  adjustmentNumber: string
  inventoryId: string
  inventoryNumber: string | null
  rollPrefix: string | null
  rollNumber: string | null
  dyeLot: string | null
  inventoryNote: string | null
  location: string | null
  area: string | null
  productId: string
  productName: string
  warehouseId: string
  workOrderId: string | null
  before: string | null
  quantity: string
  after: string | null
  cost: string | null
  freight: string | null
  // Canonical unit FK (UoM epic 2B). Optional to keep synthesized adjustment-row
  // literals valid; the normalizer always populates it for real rows. Display
  // flows through the derived `unitAbbrev`/`unitName` below.
  unitId?: string
  unitName: string | null
  unitAbbrev: string | null
  // Conversion feature — stamped from the parent inventory at create, editable
  // after. Optional to keep synthesized adjustment-row literals valid.
  // `convertedBalance` (basis = `quantity`) + `conversionUnit*` derive on-read.
  coverageUnitId?: string
  coverageUnitName?: string
  coverageUnitAbbrev?: string
  coveragePerUnit?: string
  conversionFormulaId?: string
  conversionFormulaName?: string
  convertedBalance?: string
  conversionUnitName?: string
  conversionUnitAbbrev?: string
  adjustmentType: FlooringInventoryAdjustmentType
  isWaste: boolean
  internalNotes: string
  color: PaletteColor
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

export type InventoryAdjustmentForm = {
  adjustmentType: FlooringInventoryAdjustmentType
  quantity: string
  isWaste: boolean
  internalNotes: string
  // Conversion feature — editable on the adjustment edit form. Labels ride along
  // for the picker triggers (display-only; ids + coveragePerUnit reach the server).
  coverageUnitId: string
  coverageUnitName: string
  coveragePerUnit: string
  conversionFormulaId: string
  conversionFormulaName: string
}

export type EnrichedInventoryAdjustmentRow = InventoryAdjustmentRow & {
  workOrderNumber: string | null
  warehouseName: string
}

export type EnrichedInventoryAdjustmentPage = {
  rows: EnrichedInventoryAdjustmentRow[]
  hasMore: boolean
}

export type InventoryAdjustmentListFilters = {
  // Explicit id scope — the CSV-export "selected rows" path. Never parsed from
  // the URL; the export use case merges the ticked ids in. ANDs with the other
  // filters (mirrors inventory's `InventoryListFilters.id`).
  id?: ReadonlyArray<string>
  warehouseId?: ReadonlyArray<string>
  // Category narrows via the live `product.categoryId` relation; product is a
  // direct `productId` match. Mirrors the inventory list chips.
  categoryId?: ReadonlyArray<string>
  productId?: ReadonlyArray<string>
  // Per-field identity search — the list-view search bars. `adjNumber`/`invNumber`
  // are exact integer matches on the generated `adjustmentNumberInt`/
  // `inventoryNumberInt` columns ("12" → ADJ-12/INV-12 only). `rollNumber`/
  // `dyeLot`/`note` are free-text ILIKE against their own frozen snapshot column
  // (`rollNumber`/`dyeLot`/`inventoryNote`). Multiple set fields AND together.
  adjNumber?: string
  invNumber?: string
  rollNumber?: string
  dyeLot?: string
  note?: string
  // The four shared product-attribute searches (PROD-#/color/style/naming addon)
  // resolve through the `product` relation — single-sourced with the other
  // product-linked lists.
} & ProductSearchInput

/**
 * Prev/next adjustment in a single parent inventory's ledger, walked by the
 * record-view Adjustments-section stepper. The ledger is chronological
 * (`createdAt DESC, id DESC`), so neighbors are a keyset step over that order
 * scoped to `inventoryId` — NOT the numeric `adjustmentNumberInt` sequence.
 * `adjustmentNumber` labels the stepper; `id` drives the in-place select. Null
 * at the ledger ends.
 */
export type InventoryAdjustmentNeighbor = {
  id: string
  adjustmentNumber: string
}

export type InventoryAdjustmentNeighbors = {
  previousAdjustment: InventoryAdjustmentNeighbor | null
  nextAdjustment: InventoryAdjustmentNeighbor | null
}

export type InventoryAdjustmentParentContext = {
  inventoryId: string
  startingStock: string
  cost: string | null
  freight: string | null
  currentNetDeducted: string
  // Parent inventory's unit FK (UoM epic 2B) — stamped onto the adjustment at
  // create so the ledger row carries its own unit link.
  unitId: string
  unitName: string | null
  unitAbbrev: string | null
  // Parent inventory's conversion trio — stamped onto the adjustment at create.
  coverageUnitId: string | null
  coveragePerUnit: string | null
  conversionFormulaId: string | null
  inventoryNumber: string | null
  rollPrefix: string | null
  rollNumber: string | null
  dyeLot: string | null
  inventoryNote: string | null
  location: string | null
  productId: string
  warehouseId: string
}
