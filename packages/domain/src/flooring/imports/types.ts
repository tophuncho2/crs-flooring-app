// Imports domain — read + form shapes for the post-alteration schema.
// No status / transportType concepts (dropped in the imports_staged_inventory_alteration
// migration). Manufacturer is optional.

export type ImportRow = {
  id: string
  importNumber: number
  orderNumber: string
  notes: string
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
  orderNumber: string
  notes: string
  warehouseId: string
  manufacturerId: string
}

export const EMPTY_IMPORT_PRIMARY_FORM: ImportPrimaryForm = {
  orderNumber: "",
  notes: "",
  warehouseId: "",
  manufacturerId: "",
}

export function toImportPrimaryForm(record: ImportRow): ImportPrimaryForm {
  return {
    orderNumber: record.orderNumber,
    notes: record.notes,
    warehouseId: record.warehouseId,
    manufacturerId: record.manufacturerId,
  }
}

