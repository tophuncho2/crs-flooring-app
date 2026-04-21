import type { ImportRecord } from "@builders/db"

export type CreateImportInput = {
  orderNumber: string
  tag: string
  transportType: string
  status: string
  notes: string
  warehouseId: string
}

export type UpdateImportInput = Partial<CreateImportInput>

export type ImportResult = ImportRecord
