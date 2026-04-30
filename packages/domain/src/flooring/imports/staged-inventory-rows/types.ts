// Mirror of the `FlooringStagedRowStatus` enum at
// `packages/db/prisma/schema.prisma`. Defined here as a string-literal
// union so the domain stays free of any data-layer imports (the
// prisma-guard rule keeps generated client types confined to
// `packages/db/`). Keep the value list in lockstep with the schema
// enum; the data layer's generated union is structurally identical, so
// values pass through without a runtime conversion.
export type FlooringStagedRowStatus = "DRAFT" | "QUEUED" | "IMPORTED"

// Staged inventory row — read + form shapes. Each staged row belongs to exactly
// one import (FK is RESTRICT post sweep-1 migration; the domain predicate
// `isImportDeleteBlocked` is the user-facing gate). Warehouse is required on
// the row (matches the import's warehouse). `status` is the canonical lifecycle
// (DRAFT → QUEUED → IMPORTED) introduced in sweep 1; the legacy `isImported`
// latch survives alongside it until the use-case sweep finishes the cutover.

export type StagedInventoryRow = {
  id: string
  importEntryId: string
  importNumber: number
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
  status: FlooringStagedRowStatus
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
