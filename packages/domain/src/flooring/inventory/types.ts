export { CUT_LOG_STATUS_VALUES, type CutLogRow, type CutLogStatus } from "./cut-logs/types.js"

import type { CutLogRow } from "./cut-logs/types.js"

/**
 * Read shape for a real-inventory row (post-alteration). `isImported` is gone
 * — staged rows own that flag now. Computed-at-read fields (`stockBalance`,
 * `coverageBalance`) are stamped by the data-layer normalizer via the pure
 * functions in `computed.ts`; list/record UIs never recompute on render.
 *
 * Unit fields (`stockUnit*`, `itemCoverageUnit*`, `sendUnit*`) are snapshots
 * stamped at worker-create time — they survive any future change to the
 * product's category and are immutable post-create.
 */
export type InventoryRow = {
  id: string
  importEntryId: string
  importNumber: string
  importWarehouseId: string
  importWarehouseName: string
  productId: string
  productName: string
  categoryId: string
  categoryName: string
  categorySlug: string
  stockUnitName: string
  stockUnitAbbrev: string
  itemCoverageUnitName: string
  itemCoverageUnitAbbrev: string
  sendUnitName: string
  sendUnitAbbrev: string
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
  totalCutSum: string
  cost: string
  freight: string
  costPerUnit: string
  freightPerUnit: string
  coveragePerUnit: string
  stockBalance: string
  coverageBalance: string
  isArchived: boolean
  notes: string
  fifoReceivedAt: string
  createdAt: string
  updatedAt: string
}

export type InventoryDetail = InventoryRow & {
  cutLogs: CutLogRow[]
}

/**
 * Edit form for the inventory primary section. Only the columns the user is
 * allowed to change post-create — see `editability.ts` for the canonical
 * immutable/editable split. The worker seeds startingStock + cost + freight
 * + cost/freight/coverage-per-unit; those never appear on a user form.
 */
export type InventoryForm = {
  itemNumber: string
  dyeLot: string
  warehouseId: string
  locationId: string
  notes: string
  isArchived: boolean
}

export const EMPTY_INVENTORY_FORM: InventoryForm = {
  itemNumber: "",
  dyeLot: "",
  warehouseId: "",
  locationId: "",
  notes: "",
  isArchived: false,
}

export function toInventoryForm(row: InventoryRow): InventoryForm {
  return {
    itemNumber: row.itemNumber,
    dyeLot: row.dyeLot,
    warehouseId: row.warehouseId,
    locationId: row.locationId,
    notes: row.notes,
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
  coveragePerUnit: string
}

export type InventoryWarehouseOption = {
  id: string
  name: string
  number: number
}

export type InventoryLocationOption = {
  id: string
  warehouseId: string
  locationCode: string
  shortCode: string
  sectionNumber: number | null
  warehouseName: string
}

export type InventoryCategoryOption = {
  id: string
  name: string
}

export type InventoryFormOptions = {
  products: InventoryProductOption[]
  warehouses: InventoryWarehouseOption[]
  locations: InventoryLocationOption[]
  categories: InventoryCategoryOption[]
}
