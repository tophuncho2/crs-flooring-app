export type FlooringStagedRowStatus = "DRAFT" | "QUEUED" | "IMPORTED"

export type StagedInventoryRow = {
  id: string
  importEntryId: string
  importNumber: number
  productId: string
  productName: string
  categoryId: string
  stockUnitName: string
  stockUnitAbbrev: string
  rollPrefix: string
  rollNumber: string
  dyeLot: string
  warehouseId: string
  warehouseName: string
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
  cost: string
  freight: string
  note: string
}

export const EMPTY_STAGED_INVENTORY_FORM: StagedInventoryForm = {
  rollNumber: "",
  dyeLot: "",
  location: "",
  startingStock: "",
  cost: "",
  freight: "",
  note: "",
}

export function toStagedInventoryForm(row: StagedInventoryRow): StagedInventoryForm {
  return {
    rollNumber: row.rollNumber,
    dyeLot: row.dyeLot,
    location: row.location,
    startingStock: row.startingStock,
    cost: row.cost,
    freight: row.freight,
    note: row.note,
  }
}
