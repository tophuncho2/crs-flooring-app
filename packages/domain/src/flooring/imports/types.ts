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
 * An adjacent import in the global import-number sequence (`importNumber`).
 * Carries only `id` — the record-view stepper navigates straight to the
 * neighbor record by number. Null at the ends of the sequence.
 */
export type ImportNeighbor = {
  id: string
}

export type ImportDetail = ImportRow & {
  stagedInventoryRows: ReadonlyArray<{ id: string }>
  inventories: ReadonlyArray<{ id: string }>
  /**
   * Neighbors by global import-number order (`importNumber`), ignoring any list
   * filters — powers the record-view shell stepper (◀ IMP-# ▶). Null when the
   * current row is at the start/end of the sequence.
   */
  previousImport: ImportNeighbor | null
  nextImport: ImportNeighbor | null
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
