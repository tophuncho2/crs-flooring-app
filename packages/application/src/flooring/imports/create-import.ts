import {
  Prisma,
  createImportRecord,
  getWarehouseById,
  withDatabaseTransaction,
} from "@builders/db"
import { DEFAULT_PALETTE_COLOR, validateImportPrimaryForm } from "@builders/domain"
import { ImportExecutionError } from "./errors.js"
import type { CreateImportInput, ImportResult } from "./types.js"

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export async function createImportUseCase(
  input: CreateImportInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<ImportResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("createImportUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    // color is metadata-only and unread by the validator; create rows fall to the
    // DB default SLATE, so satisfy the form type with the default tag.
    const issues = validateImportPrimaryForm({ ...input, color: DEFAULT_PALETTE_COLOR })
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
        purchaseOrderNumber: emptyToNull(input.purchaseOrderNumber),
        internalNotes: emptyToNull(input.internalNotes),
        warehouseId: input.warehouseId,
        manufacturerId: emptyToNull(input.manufacturerId),
        createdBy: actorEmail,
        updatedBy: actorEmail,
      },
      c,
    )
  })
}
