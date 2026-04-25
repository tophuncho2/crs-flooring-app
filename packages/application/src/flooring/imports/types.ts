import type { ImportRecord } from "@builders/db"

export type CreateImportInput = {
  orderNumber: string
  tag: string
  notes: string
  warehouseId: string
  manufacturerId: string
}

export type UpdateImportInput = Partial<CreateImportInput>

export type ImportResult = ImportRecord
