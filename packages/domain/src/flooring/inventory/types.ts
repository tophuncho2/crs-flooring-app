export {
  type InventoryAdjustmentRow,
  type EnrichedInventoryAdjustmentRow,
} from "./adjustments/types.js"

import type { EnrichedInventoryAdjustmentRow } from "./adjustments/types.js"
import type { PaletteColor } from "../../shared/palette.js"

export type InventoryRow = {
  id: string
  inventoryNumber: string
  importEntryId: string
  importNumber: number | null
  purchaseOrderNumber: string
  productId: string
  productName: string
  categoryId: string
  stockUnitName: string
  stockUnitAbbrev: string
  sendUnitName: string
  sendUnitAbbrev: string
  rollPrefix: string
  rollNumber: string
  dyeLot: string
  warehouseId: string
  warehouseName: string
  location: string
  startingStock: string
  cost: string
  freight: string
  netDeducted: string
  stockBalance: string
  isArchived: boolean
  wasMerged: boolean
  note: string
  internalNotes: string
  color: PaletteColor
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

/**
 * An adjacent inventory row in the global inventory-number sequence
 * (`inventoryNumberInt`). The `warehouseId` rides along so the record-view
 * shell stepper can sync the header warehouse to the stepped-to row (the
 * sequence is global and can cross warehouses). Null at the ends.
 */
export type InventoryNeighbor = {
  id: string
  warehouseId: string
}

export type InventoryDetail = InventoryRow & {
  inventoryAdjustments: EnrichedInventoryAdjustmentRow[]
  /**
   * Neighbors by global inventory-number order (`inventoryNumberInt`), ignoring
   * warehouse/product/archive filters — powers the record-view shell stepper
   * (◀ INV-# ▶). Null when the current row is at the start/end of the sequence.
   */
  previousInventory: InventoryNeighbor | null
  nextInventory: InventoryNeighbor | null
}

export type InventoryForm = {
  location: string
  internalNotes: string
  isArchived: boolean
  color: PaletteColor
}

export function toInventoryForm(row: InventoryRow): InventoryForm {
  return {
    location: row.location,
    internalNotes: row.internalNotes,
    isArchived: row.isArchived,
    color: row.color,
  }
}

export type InventoryProductOption = {
  id: string
  name: string
  label: string
  style: string | null
  color: string | null
  categoryId: string
  stockUnit: string
  sendUnit: string
}

export type InventoryWarehouseOption = {
  id: string
  name: string
}

export type InventoryCategoryOption = {
  id: string
  name: string
}

export type InventoryFormOptions = {
  products: InventoryProductOption[]
  warehouses: InventoryWarehouseOption[]
  categories: InventoryCategoryOption[]
}

export type InventoryOption = {
  id: string
  // Raw identity columns — side-panel pickers render/seed the four-column
  // identity (inv# / roll# / dye lot / note).
  inventoryNumber: string | null
  rollNumber: string | null
  dyeLot: string | null
  note: string | null
  warehouseId: string
  location: string | null
  stockBalance: string
  stockUnitAbbrev: string
}

export type InventoryLocationOption = {
  value: string
}

export type InventoryPurchaseOrderOption = {
  value: string
}

export type InventoryImportNumberOption = {
  value: string
}
