// Staged inventory row — read + form shapes. Each staged row belongs to exactly
// one import (cascade delete at the schema level, though the domain predicate
// `isImportDeleteBlocked` prevents that cascade from ever firing while staged
// rows exist). Warehouse is required on the row (matches the import's warehouse).
// `isImported` is the one-way latch the worker flips when it materializes the
// row into a real `FlooringInventory` row.

export type StagedInventoryRow = {
  id: string
  importEntryId: string
  importNumber: string
  productId: string
  productName: string
  categoryId: string
  categoryName: string
  categorySlug: string
  stockUnit: string
  itemNumber: string
  dyeLot: string
  warehouseId: string
  warehouseName: string
  warehouseNumber: string
  locationId: string
  locationCode: string
  locationShortCode: string
  sectionNumber: string
  rafter: string
  level: string
  startingStock: string
  isImported: boolean
  cost: string
  freight: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type StagedInventoryForm = {
  productId: string
  warehouseId: string
  locationId: string
  itemNumber: string
  dyeLot: string
  startingStock: string
  cost: string
  freight: string
  notes: string
}

export const EMPTY_STAGED_INVENTORY_FORM: StagedInventoryForm = {
  productId: "",
  warehouseId: "",
  locationId: "",
  itemNumber: "",
  dyeLot: "",
  startingStock: "",
  cost: "",
  freight: "",
  notes: "",
}

export function toStagedInventoryForm(row: StagedInventoryRow): StagedInventoryForm {
  return {
    productId: row.productId,
    warehouseId: row.warehouseId,
    locationId: row.locationId,
    itemNumber: row.itemNumber,
    dyeLot: row.dyeLot,
    startingStock: row.startingStock,
    cost: row.cost,
    freight: row.freight,
    notes: row.notes,
  }
}
