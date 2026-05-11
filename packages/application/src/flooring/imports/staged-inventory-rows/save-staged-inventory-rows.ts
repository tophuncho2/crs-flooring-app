import { randomUUID } from "node:crypto"
import {
  Prisma,
  applyStagedInventoryRowsDiff,
  getImportById,
  listProducts,
  listStagedInventoryByImport,
  withDatabaseTransaction,
  type StagedInventoryRecord,
  type UpdateStagedInventoryRecordInput,
} from "@builders/db"
import {
  assignStagedInventoryDiffIds,
  describeStagedInventoryDiffIssues,
  validateStagedInventoryRowsDiff,
  type DiffExistingStagedInventoryRow,
  type StagedInventoryParentContext,
  type StagedInventoryRowUpdate,
  type StagedInventoryRowUpdatePatch,
  type StagedInventoryRowsDiff,
} from "@builders/domain"
import { StagedInventoryExecutionError } from "./errors.js"
import type { SaveStagedInventoryRowsResult } from "./types.js"

function toExistingDiffRow(row: StagedInventoryRecord): DiffExistingStagedInventoryRow {
  return {
    id: row.id,
    productId: row.productId,
    rollNumber: row.rollNumber,
    warehouseId: row.warehouseId,
    isImported: row.isImported,
  }
}

function patchToDbUpdate(
  patch: StagedInventoryRowUpdatePatch,
): UpdateStagedInventoryRecordInput {
  const data: UpdateStagedInventoryRecordInput = {}
  if (patch.productId !== undefined) data.productId = patch.productId
  if (patch.rollNumber !== undefined) data.rollNumber = patch.rollNumber
  if (patch.dyeLot !== undefined) data.dyeLot = patch.dyeLot
  if (patch.warehouseId !== undefined) data.warehouseId = patch.warehouseId
  if (patch.location !== undefined) data.location = patch.location
  if (patch.startingStock !== undefined) data.startingStock = patch.startingStock
  if (patch.note !== undefined) data.note = patch.note
  return data
}

function assertRowVersions(
  diff: StagedInventoryRowsDiff,
  existingById: Map<string, StagedInventoryRecord>,
): void {
  const checks: Array<{ id: string; expectedUpdatedAt: string }> = [
    ...diff.modified.map((m: StagedInventoryRowUpdate) => ({
      id: m.id,
      expectedUpdatedAt: m.expectedUpdatedAt,
    })),
    ...diff.deleted.map((d) => ({ id: d.id, expectedUpdatedAt: d.expectedUpdatedAt })),
  ]
  for (const check of checks) {
    const row = existingById.get(check.id)
    if (!row) continue
    if (row.updatedAt !== check.expectedUpdatedAt) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_STALE_ROW_VERSION",
        message: "Staged row was modified by another change. Reload and try again.",
        status: 409,
        payload: {
          rowId: check.id,
          expectedUpdatedAt: check.expectedUpdatedAt,
          actualUpdatedAt: row.updatedAt,
        },
      })
    }
  }
}

export async function saveStagedInventoryRowsUseCase(
  importEntryId: string,
  diff: StagedInventoryRowsDiff,
  client?: Prisma.TransactionClient,
): Promise<SaveStagedInventoryRowsResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    await c.$queryRaw(
      Prisma.sql`SELECT "id" FROM "flooring_import_entry" WHERE "id" = ${importEntryId} FOR UPDATE`,
    )

    const parent = await getImportById(importEntryId, c)
    if (!parent) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_PARENT_NOT_FOUND",
        message: "Import not found.",
        status: 404,
      })
    }

    const existingRows = await listStagedInventoryByImport(importEntryId, c)
    const existingById = new Map(existingRows.map((row) => [row.id, row]))

    assertRowVersions(diff, existingById)

    const existing = existingRows.map(toExistingDiffRow)

    const products = await listProducts(c)
    const knownProductIds = products.map((p) => p.id)

    const parentContext: StagedInventoryParentContext = {
      importEntryId,
      warehouseId: parent.warehouseId,
    }

    const issues = validateStagedInventoryRowsDiff(
      diff,
      { existing, knownProductIds },
      parentContext,
    )
    if (issues.length > 0) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_DIFF_VALIDATION_FAILED",
        message: describeStagedInventoryDiffIssues(issues),
        status: 400,
        payload: { issues },
      })
    }

    const addedWithIds = assignStagedInventoryDiffIds(diff.added, () => randomUUID())
    const tempIdMap: Record<string, string> = {}
    for (const draft of addedWithIds) {
      tempIdMap[draft.tempId] = draft.id
    }

    const result = await applyStagedInventoryRowsDiff(c, {
      importEntryId,
      added: addedWithIds.map((draft) => ({
        id: draft.id,
        tempId: draft.tempId,
        productId: draft.productId,
        // `rollNumber` is the bare suffix typed by the user; the display
        // prefix lives in the separate `rollPrefix` column (default
        // `"ROLL#"`, applied by the DB on insert). The materialize worker
        // copies both columns verbatim onto the resulting inventory row.
        rollNumber: draft.rollNumber,
        dyeLot: draft.dyeLot,
        warehouseId: draft.warehouseId,
        location: draft.location,
        startingStock: draft.startingStock,
        note: draft.note,
      })),
      modified: diff.modified.map((m) => ({
        id: m.id,
        patch: patchToDbUpdate(m.patch),
      })),
      deleted: diff.deleted.map((d) => ({ id: d.id })),
    })

    return { rows: result.rows, tempIdMap }
  })
}
