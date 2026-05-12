import {
  Prisma,
  createStagedInventoryRecord,
  getFilterRowById,
  getImportById,
  withDatabaseTransaction,
} from "@builders/db"
import { validateStagedInventoryForm } from "@builders/domain"
import { StagedInventoryExecutionError } from "./errors.js"
import type {
  CreateStagedInventoryRowInput,
  CreateStagedInventoryRowResult,
} from "./types.js"

/**
 * Per-row create. The staged row snapshots productId / stockUnitName /
 * stockUnitAbbrev from the parent filter row and warehouseId from the
 * parent import — none of those four fields appear on the form. The
 * data layer's `CreateStagedInventoryRecordInput` requires all of them.
 *
 * Parent-import lock is held FOR UPDATE for the duration of the
 * transaction so concurrent create / update / delete / mark-for-import
 * callers don't race against the same filter row's children.
 */
export async function createStagedInventoryRowUseCase(
  input: CreateStagedInventoryRowInput,
  client?: Prisma.TransactionClient,
): Promise<CreateStagedInventoryRowResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    await c.$queryRaw(
      Prisma.sql`SELECT "id" FROM "flooring_import_entry" WHERE "id" = ${input.importEntryId} FOR UPDATE`,
    )

    const parent = await getImportById(input.importEntryId, c)
    if (!parent) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_PARENT_NOT_FOUND",
        message: "Import not found.",
        status: 404,
      })
    }

    const filterRow = await getFilterRowById(input.filterRowId, c)
    if (!filterRow || filterRow.importEntryId !== input.importEntryId) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_VALIDATION_FAILED",
        message: "Filter row not found for this import.",
        status: 404,
        payload: { filterRowId: input.filterRowId },
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

    const row = await createStagedInventoryRecord(
      {
        importEntryId: input.importEntryId,
        filterRowId: input.filterRowId,
        productId: filterRow.productId,
        warehouseId: parent.warehouseId,
        stockUnitName: filterRow.stockUnitName || null,
        stockUnitAbbrev: filterRow.stockUnitAbbrev || null,
        rollNumber: input.form.rollNumber || null,
        dyeLot: input.form.dyeLot || null,
        location: input.form.location || null,
        startingStock: input.form.startingStock,
        note: input.form.note || null,
      },
      c,
    )

    const refreshedFilterRow = await getFilterRowById(input.filterRowId, c)
    if (!refreshedFilterRow) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_VALIDATION_FAILED",
        message: "Filter row disappeared mid-transaction.",
        status: 500,
      })
    }

    return { row, filterRow: refreshedFilterRow }
  })
}
