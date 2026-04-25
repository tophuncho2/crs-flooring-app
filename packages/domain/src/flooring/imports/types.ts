// Imports domain — read + form shapes for the post-alteration schema.
// No status / transportType concepts (dropped in the imports_staged_inventory_alteration
// migration). Percent is a worker-maintained Decimal(5,2). Manufacturer is optional.

export type ImportRow = {
  id: string
  importNumber: number
  orderNumber: string
  tag: string
  percent: string
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
  tag: string
  notes: string
  warehouseId: string
  manufacturerId: string
}

export const EMPTY_IMPORT_PRIMARY_FORM: ImportPrimaryForm = {
  orderNumber: "",
  tag: "",
  notes: "",
  warehouseId: "",
  manufacturerId: "",
}

export function toImportPrimaryForm(record: ImportRow): ImportPrimaryForm {
  return {
    orderNumber: record.orderNumber,
    tag: record.tag,
    notes: record.notes,
    warehouseId: record.warehouseId,
    manufacturerId: record.manufacturerId,
  }
}

// Form-options shape consumed by the imports record + create views. Mirrors
// `InventoryFormOptions` in the inventory module — option types are flattened
// for the UI (no Prisma payloads), and the data layer composes the shape from
// canonical readers.

export type ImportProductOption = {
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

export type ImportWarehouseOption = {
  id: string
  name: string
  number: number
}

export type ImportLocationOption = {
  id: string
  warehouseId: string
  locationCode: string
  shortCode: string
  sectionNumber: number | null
  warehouseName: string
}

export type ImportCategoryOption = {
  id: string
  name: string
}

export type ImportManufacturerOption = {
  id: string
  companyName: string
}

export type ImportFormOptions = {
  products: ImportProductOption[]
  warehouses: ImportWarehouseOption[]
  locations: ImportLocationOption[]
  categories: ImportCategoryOption[]
  manufacturers: ImportManufacturerOption[]
}
