export type FlooringStagedRowStatus = "DRAFT" | "QUEUED" | "IMPORTED"

export type StagedInventoryRow = {
  id: string
  importEntryId: string
  importNumber: number
  filterRowId: string
  productId: string
  productName: string
  categoryId: string
  categoryName: string
  categorySlug: string
  stockUnitName: string
  stockUnitAbbrev: string
  rollPrefix: string
  rollNumber: string
  dyeLot: string
  warehouseId: string
  warehouseName: string
  warehouseNumber: string
  location: string
  startingStock: string
  cost: string
  freight: string
  status: FlooringStagedRowStatus
  isImported: boolean
  note: string
  createdAt: string
  updatedAt: string
}

export type StagedInventoryForm = {
  rollNumber: string
  dyeLot: string
  location: string
  startingStock: string
  note: string
}

export const EMPTY_STAGED_INVENTORY_FORM: StagedInventoryForm = {
  rollNumber: "",
  dyeLot: "",
  location: "",
  startingStock: "",
  note: "",
}

export function toStagedInventoryForm(row: StagedInventoryRow): StagedInventoryForm {
  return {
    rollNumber: row.rollNumber,
    dyeLot: row.dyeLot,
    location: row.location,
    startingStock: row.startingStock,
    note: row.note,
  }
}
