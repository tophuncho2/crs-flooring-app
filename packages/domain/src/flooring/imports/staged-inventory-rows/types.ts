export type FlooringStagedRowStatus = "DRAFT" | "QUEUED" | "IMPORTED"

export type StagedInventoryRow = {
  id: string
  importEntryId: string
  importNumber: number
  productId: string
  productName: string
  categoryId: string
  // Canonical unit FK (UoM epic 2B) — editable in staging, materialized forward
  // by the worker. "" when unset (a draft can lack a unit; the importability
  // gate blocks queueing until it's set). Display derives from the join below.
  unitId: string
  unitName: string
  unitAbbrev: string
  rollPrefix: string
  rollNumber: string
  dyeLot: string
  // Warehouse is parent-owned — sourced from the import entry, not a stored
  // staged-row column. Carried here for display + batch-eligibility.
  warehouseId: string
  warehouseName: string
  location: string
  startingStock: string
  cost: string
  freight: string
  status: FlooringStagedRowStatus
  note: string
  createdAt: string
  updatedAt: string
}

export type StagedInventoryForm = {
  unitId: string
  rollNumber: string
  dyeLot: string
  location: string
  startingStock: string
  cost: string
  freight: string
  note: string
}

export const EMPTY_STAGED_INVENTORY_FORM: StagedInventoryForm = {
  unitId: "",
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
    unitId: row.unitId,
    rollNumber: row.rollNumber,
    dyeLot: row.dyeLot,
    location: row.location,
    startingStock: row.startingStock,
    cost: row.cost,
    freight: row.freight,
    note: row.note,
  }
}
