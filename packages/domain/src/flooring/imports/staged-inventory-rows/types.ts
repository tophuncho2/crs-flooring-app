import type { FlooringStagedRowStatus } from "@prisma/client"

// Re-exported so consumers don't have to reach into Prisma directly.
export type { FlooringStagedRowStatus } from "@prisma/client"

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
