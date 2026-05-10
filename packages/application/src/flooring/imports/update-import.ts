import {
  Prisma,
  getImportById,
  getWarehouseById,
  updateImportRecord,
  withDatabaseTransaction,
  type UpdateImportRecordInput as DbUpdateImportInput,
} from "@builders/db"
import {
  validateImportPrimaryForm,
  type ImportPrimaryForm,
} from "@builders/domain"
import { ImportExecutionError } from "./errors.js"
import type { ImportResult, UpdateImportInput } from "./types.js"

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function toPrimaryForm(input: UpdateImportInput, current: ImportPrimaryForm): ImportPrimaryForm {
  return {
    purchaseOrderNumber: input.purchaseOrderNumber ?? current.purchaseOrderNumber,
    internalNotes: input.internalNotes ?? current.internalNotes,
    warehouseId: input.warehouseId ?? current.warehouseId,
    manufacturerId: input.manufacturerId ?? current.manufacturerId,
  }
}

export async function updateImportUseCase(
  id: string,
  input: UpdateImportInput,
  client?: Prisma.TransactionClient,
): Promise<ImportResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const current = await getImportById(id, c)
    if (!current) {
      throw new ImportExecutionError({
        code: "IMPORT_NOT_FOUND",
        message: "Import not found.",
        status: 404,
      })
    }

    const merged = toPrimaryForm(input, {
      purchaseOrderNumber: current.purchaseOrderNumber,
      internalNotes: current.internalNotes,
      warehouseId: current.warehouseId,
      manufacturerId: current.manufacturerId,
    })

    const issues = validateImportPrimaryForm(merged)
    if (issues.length > 0) {
      const [first] = issues
      throw new ImportExecutionError({
        code: "IMPORT_VALIDATION_FAILED",
        message: first.message,
        status: 400,
        field: first.field,
        payload: { issues },
      })
    }

    if (input.warehouseId !== undefined && input.warehouseId !== current.warehouseId) {
      const warehouse = await getWarehouseById(merged.warehouseId, c)
      if (!warehouse) {
        throw new ImportExecutionError({
          code: "IMPORT_WAREHOUSE_NOT_FOUND",
          message: "Selected warehouse does not exist.",
          status: 404,
          field: "warehouseId",
        })
      }
    }

    const dbInput: DbUpdateImportInput = {}
    if (input.purchaseOrderNumber !== undefined) dbInput.purchaseOrderNumber = emptyToNull(input.purchaseOrderNumber)
    if (input.internalNotes !== undefined) dbInput.internalNotes = emptyToNull(input.internalNotes)
    if (input.warehouseId !== undefined) {
      dbInput.warehouseId = input.warehouseId
    }
    if (input.manufacturerId !== undefined) {
      dbInput.manufacturerId = emptyToNull(input.manufacturerId)
    }

    return updateImportRecord(id, dbInput, c)
  })
}
