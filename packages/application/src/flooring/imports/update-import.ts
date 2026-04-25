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
    orderNumber: input.orderNumber ?? current.orderNumber,
    tag: input.tag ?? current.tag,
    notes: input.notes ?? current.notes,
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
      orderNumber: current.orderNumber,
      tag: current.tag,
      notes: current.notes,
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
    if (input.orderNumber !== undefined) dbInput.orderNumber = emptyToNull(input.orderNumber)
    if (input.tag !== undefined) dbInput.tag = emptyToNull(input.tag)
    if (input.notes !== undefined) dbInput.notes = emptyToNull(input.notes)
    if (input.warehouseId !== undefined) {
      dbInput.warehouseId = input.warehouseId
    }
    if (input.manufacturerId !== undefined) {
      dbInput.manufacturerId = emptyToNull(input.manufacturerId)
    }

    return updateImportRecord(id, dbInput, c)
  })
}
