export {
  type InventoryAdjustmentRow,
  type InventoryAdjustmentStatus,
  type EnrichedInventoryAdjustmentRow,
} from "./adjustments/types.js"

import type { EnrichedInventoryAdjustmentRow } from "./adjustments/types.js"

export type InventoryRow = {
  id: string
  inventoryNumber: string
  importEntryId: string
  importNumber: string
  purchaseOrderNumber: string
  productId: string
  productName: string
  categoryId: string
  categoryName: string
  categorySlug: string
  stockUnitName: string
  stockUnitAbbrev: string
  sendUnitName: string
  sendUnitAbbrev: string
  rollPrefix: string
  rollNumber: string
  dyeLot: string
  warehouseId: string
  warehouseName: string
  warehouseNumber: string
  location: string
  startingStock: string
  netDeducted: string
  stockBalance: string
  isArchived: boolean
  note: string
  internalNotes: string
  inventoryItem: string
  fifoReceivedAt: string
  createdAt: string
  updatedAt: string
}

export type InventoryDetail = InventoryRow & {
  inventoryAdjustments: EnrichedInventoryAdjustmentRow[]
}

export type InventoryForm = {
  rollNumber: string
  dyeLot: string
  location: string
  note: string
  internalNotes: string
  isArchived: boolean
}

export function toInventoryForm(row: InventoryRow): InventoryForm {
  return {
    rollNumber: row.rollNumber,
    dyeLot: row.dyeLot,
    location: row.location,
    note: row.note,
    internalNotes: row.internalNotes,
    isArchived: row.isArchived,
  }
}

export type InventoryProductOption = {
  id: string
  name: string
  label: string
  style: string | null
  color: string | null
  categoryId: string
  categorySlug: string
  stockUnit: string
  sendUnit: string
}

export type InventoryWarehouseOption = {
  id: string
  name: string
  number: number
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
  inventoryItem: string
  // Raw identity columns — kept alongside the denormalized `inventoryItem` blob
  // so side-panel pickers can render/seed the four-column identity (inv# / roll# /
  // dye lot / note) instead of one string.
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
