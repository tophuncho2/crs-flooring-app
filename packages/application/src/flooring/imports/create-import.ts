import {
  Prisma,
  createImportRecord,
  getWarehouseById,
  withDatabaseTransaction,
} from "@builders/db"
import { validateImportPrimaryForm } from "@builders/domain"
import { ImportExecutionError } from "./errors.js"
import type { CreateImportInput, ImportResult } from "./types.js"

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export async function createImportUseCase(
  input: CreateImportInput,
  client?: Prisma.TransactionClient,
): Promise<ImportResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const issues = validateImportPrimaryForm(input)
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

    const warehouse = await getWarehouseById(input.warehouseId, c)
    if (!warehouse) {
      throw new ImportExecutionError({
        code: "IMPORT_WAREHOUSE_NOT_FOUND",
        message: "Selected warehouse does not exist.",
        status: 404,
        field: "warehouseId",
      })
    }

    return createImportRecord(
      {
        orderNumber: emptyToNull(input.orderNumber),
        tag: emptyToNull(input.tag),
        notes: emptyToNull(input.notes),
        warehouseId: input.warehouseId,
        manufacturerId: emptyToNull(input.manufacturerId),
      },
      c,
    )
  })
}
