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

export type ImportOption = {
  id: string
  importNumber: string
  purchaseOrderNumber: string
  warehouseName: string
  createdAt: string
}
