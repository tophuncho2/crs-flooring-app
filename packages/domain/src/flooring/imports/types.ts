// Imports domain — read + form shapes for the post-alteration schema.
// No status / transportType concepts (dropped in the imports_staged_inventory_alteration
// migration). Manufacturer is optional.

export type ImportRow = {
  id: string
  importNumber: number
  purchaseOrderNumber: string
  internalNotes: string
  warehouseId: string
  warehouseName: string
  manufacturerId: string
  manufacturerName: string
  stagedInventoryRowsCount: number
  liveInventoryRowsCount: number
  createdAt: string
  updatedAt: string
}

/**
 * Detail shape used by the import record view. Consumers will see both the
 * staged rows (the draft inventory workers prep) and the live inventory rows
 * (the real inventory the worker materialized from staged). Row types are
 * declared in their own domain folders; this file only references the shapes
 * structurally so the types can resolve without a cross-module import.
 */
export type ImportDetail = ImportRow & {
  stagedInventoryRows: ReadonlyArray<{ id: string }>
  inventories: ReadonlyArray<{ id: string }>
}

export type ImportPrimaryForm = {
  purchaseOrderNumber: string
  internalNotes: string
  warehouseId: string
  manufacturerId: string
}

export const EMPTY_IMPORT_PRIMARY_FORM: ImportPrimaryForm = {
  purchaseOrderNumber: "",
  internalNotes: "",
  warehouseId: "",
  manufacturerId: "",
}

export function toImportPrimaryForm(record: ImportRow): ImportPrimaryForm {
  return {
    purchaseOrderNumber: record.purchaseOrderNumber,
    internalNotes: record.internalNotes,
    warehouseId: record.warehouseId,
    manufacturerId: record.manufacturerId,
  }
}

/**
 * Picker option row for the imports async dropdowns (Import # / PO # filter
 * chips on the inventory list view). `importNumber` is the stringified `Int`
 * from `FlooringImportEntry` so the value matches the denormalized snapshot
 * stored on `FlooringInventory.importNumber` (worker stamps
 * `String(importEntry.importNumber)` at materialize time). That alignment is
 * what lets the chip push the picked string straight through to the inventory
 * list filter as-is. `purchaseOrderNumber` is the canonical column on the
 * import entry, also written verbatim to the inventory snapshot.
 */
export type ImportOption = {
  id: string
  importNumber: string
  purchaseOrderNumber: string
  warehouseName: string
  createdAt: string
}

