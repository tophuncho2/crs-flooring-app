export {
  type CutLogRow,
  type CutLogStatus,
  type InventoryCutLogRow,
} from "./cut-logs/types.js"

import type { InventoryCutLogRow } from "./cut-logs/types.js"

/**
 * Read shape for a real-inventory row (post-alteration). `isImported` is gone
 * — staged rows own that flag now. `inventoryNumber` is the human-readable
 * "INV-{N}" identifier sequence-assigned by Postgres at create time (sweep-1
 * migration; unpadded after the 2026-05-21 inventory_unpad migration —
 * historical demo rows may still carry the legacy "INV-0XXXX" shape until the
 * pre-v1 wipe). Computed-at-read fields (`stockBalance`, `coverageBalance`)
 * are stamped by the data-layer normalizer via the pure functions in
 * `computed.ts`; list/record UIs never recompute on render.
 *
 * Unit fields (`stockUnitName`, `stockUnitAbbrev`, `itemCoverageUnit*`,
 * `sendUnit*`) are snapshots stamped at worker-create time — they survive any
 * future change to the product's category and are immutable post-create.
 *
 * Snapshot fields (`productName`, `categoryName`, `importNumber`,
 * `purchaseOrderNumber`) are written once by the worker on materialize and
 * never updated by the inventory record view.
 *
 * `rollPrefix` is the display prefix for the roll number (default `"ROLL#"`,
 * persisted column with a DB default). It is non-editable — never appears on
 * a form, never in a mutation payload. UI surfaces compose the display form
 * via `composeRollNumberDisplay(prefix, rollNumber)`.
 *
 * `inventoryItem` is the canonical search/display string composed from
 * `inventoryNumber + {rollPrefix+rollNumber} + location + dyeLot + note`. The
 * application's inventory-update use case recomputes it inside the same
 * transaction as any patch that touches its source fields. List view + picker
 * server-side search targets this column.
 */
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
  itemCoverageUnitName: string
  itemCoverageUnitAbbrev: string
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
  totalCutSum: string
  coveragePerUnit: string
  stockBalance: string
  coverageBalance: string
  isArchived: boolean
  note: string
  internalNotes: string
  inventoryItem: string
  fifoReceivedAt: string
  createdAt: string
  updatedAt: string
}

export type InventoryDetail = InventoryRow & {
  cutLogs: InventoryCutLogRow[]
}

/**
 * Update-form shape for the inventory primary section. Inventory rows are
 * not user-creatable — the materialize import worker is the only path that
 * adds rows. This form only carries the columns the user is allowed to
 * change post-create; see `editability.ts` for the canonical
 * immutable/editable split.
 */
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
  coveragePerUnit: string
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

/**
 * Slim option shape consumed by the canonical InventoryPicker (server-side
 * search). Inventory rows always belong to a warehouse — picker requires
 * `warehouseId` scope. `inventoryItem` is the canonical label source (already
 * encodes inv#/roll#/location/dyeLot/note); `stockBalance` and
 * `coverageBalance` are stamped by the data-layer normalizer (same
 * source-of-truth math as `InventoryRow.stockBalance`); coverage is null for
 * non-coverage categories.
 */
export type InventoryOption = {
  id: string
  inventoryItem: string
  warehouseId: string
  location: string | null
  stockBalance: string
  stockUnitAbbrev: string
  coverageBalance: string | null
  itemCoverageUnitAbbrev: string
}

/**
 * Option shape for the warehouse-scoped LocationPicker. Locations have no
 * separate entity — values are derived via `SELECT DISTINCT location` over
 * the inventory table for a given warehouse, so the option carries only the
 * raw string. The picker renders `value` as both id and title.
 */
export type InventoryLocationOption = {
  value: string
}

