import {
  Prisma,
  deleteStagedInventoryRecordById,
  getFilterRowById,
  getStagedInventoryById,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildStagedRowNotDraftMessage,
  isStagedRowEditable,
} from "@builders/domain"
import { StagedInventoryExecutionError } from "./errors.js"
import type {
  DeleteStagedInventoryRowInput,
  DeleteStagedInventoryRowResult,
} from "./types.js"

/**
 * Per-row delete. Same gates as update: scope check, OCC, status must
 * be DRAFT. The filter row's RESTRICT FK is the last-line backstop
 * against deleting an IMPORTED row that's already been materialized
 * (the linked inventory row depends on it).
 */
export async function deleteStagedInventoryRowUseCase(
  input: DeleteStagedInventoryRowInput,
  client?: Prisma.TransactionClient,
): Promise<DeleteStagedInventoryRowResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    await c.$queryRaw(
      Prisma.sql`SELECT "id" FROM "flooring_import_entry" WHERE "id" = ${input.importEntryId} FOR UPDATE`,
    )

    const existing = await getStagedInventoryById(input.rowId, c)
    if (!existing || existing.importEntryId !== input.importEntryId) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_VALIDATION_FAILED",
        message: "Staged row not found for this import.",
        status: 404,
        payload: { rowId: input.rowId },
      })
    }

    if (existing.updatedAt !== input.expectedUpdatedAt) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_STALE_ROW_VERSION",
        message: "Staged row was modified by another change. Reload and try again.",
        status: 409,
        payload: {
          rowId: input.rowId,
          expectedUpdatedAt: input.expectedUpdatedAt,
          actualUpdatedAt: existing.updatedAt,
        },
      })
    }

    if (!isStagedRowEditable(existing)) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_VALIDATION_FAILED",
        message: buildStagedRowNotDraftMessage(existing),
        status: 409,
        payload: { rowId: input.rowId, status: existing.status },
      })
    }

    const filterRowId = existing.filterRowId
    await deleteStagedInventoryRecordById(input.rowId, c)

    const filterRow = await getFilterRowById(filterRowId, c)
    if (!filterRow) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_VALIDATION_FAILED",
        message: "Filter row disappeared mid-transaction.",
        status: 500,
      })
    }

    return { deletedId: input.rowId, filterRow }
  })
}
