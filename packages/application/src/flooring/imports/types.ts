import type { ImportRecord } from "@builders/db"

export type CreateImportInput = {
  purchaseOrderNumber: string
  internalNotes: string
  warehouseId: string
  manufacturerId: string
}

export type UpdateImportInput = Partial<CreateImportInput>

export type ImportResult = ImportRecord
