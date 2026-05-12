// Mirror of the `FlooringStagedRowStatus` enum at
// `packages/db/prisma/schema.prisma`. Defined here as a string-literal
// union so the domain stays free of any data-layer imports (the
// prisma-guard rule keeps generated client types confined to
// `packages/db/`). Keep the value list in lockstep with the schema
// enum; the data layer's generated union is structurally identical, so
// values pass through without a runtime conversion.
export type FlooringStagedRowStatus = "DRAFT" | "QUEUED" | "IMPORTED"

// Staged inventory row — read + form shapes. Each staged row belongs to
// exactly one filter row (and transitively one import). productId,
// stockUnitName, and stockUnitAbbrev are create-time snapshots from the
// parent filter row so the materialize worker can read everything off
// the staged row without joining through the filter. Warehouse is still
// snapshotted from the parent import.

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
  status: FlooringStagedRowStatus
  isImported: boolean
  note: string
  createdAt: string
  updatedAt: string
}

// User-editable surface on a staged inventory row. productId,
// stockUnitName, stockUnitAbbrev, warehouseId, and rollPrefix are all
// parent-owned snapshots (filter row / import) — they don't appear
// here.
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
