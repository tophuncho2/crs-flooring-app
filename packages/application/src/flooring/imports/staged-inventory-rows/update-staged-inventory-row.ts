import {
  Prisma,
  getFilterRowById,
  getStagedInventoryById,
  updateStagedInventoryRecord,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildStagedRowNotDraftMessage,
  isStagedRowEditable,
  validateStagedInventoryForm,
} from "@builders/domain"
import { StagedInventoryExecutionError } from "./errors.js"
import type {
  UpdateStagedInventoryRowInput,
  UpdateStagedInventoryRowResult,
} from "./types.js"

/**
 * Per-row update. Only user-editable fields (rollNumber, dyeLot,
 * location, startingStock, note) are accepted — productId /
 * warehouseId / filterRowId / stockUnit* are immutable snapshots
 * stamped at create time and don't exist on
 * `UpdateStagedInventoryRecordInput`.
 *
 * OCC: caller passes `expectedUpdatedAt` from its snapshot; we reject
 * with 409 if the row has been touched since.
 *
 * Status gate: only DRAFT rows are editable — QUEUED rows belong to
 * the worker; IMPORTED rows are terminal.
 */
export async function updateStagedInventoryRowUseCase(
  input: UpdateStagedInventoryRowInput,
  client?: Prisma.TransactionClient,
): Promise<UpdateStagedInventoryRowResult> {
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

    const issues = validateStagedInventoryForm(input.form)
    if (issues.length > 0) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_VALIDATION_FAILED",
        message: issues[0]!.code,
        status: 400,
        payload: { issues },
      })
    }

    const row = await updateStagedInventoryRecord(
      input.rowId,
      {
        rollNumber: input.form.rollNumber || null,
        dyeLot: input.form.dyeLot || null,
        location: input.form.location || null,
        startingStock: input.form.startingStock,
        note: input.form.note || null,
      },
      c,
    )

    const filterRow = await getFilterRowById(existing.filterRowId, c)
    if (!filterRow) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_VALIDATION_FAILED",
        message: "Filter row disappeared mid-transaction.",
        status: 500,
      })
    }

    return { row, filterRow }
  })
}
