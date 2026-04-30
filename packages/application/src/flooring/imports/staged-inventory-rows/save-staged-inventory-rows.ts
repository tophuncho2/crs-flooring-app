import { randomUUID } from "node:crypto"
import {
  Prisma,
  applyStagedInventoryRowsDiff,
  getImportById,
  getLocationById,
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
  type DiffStagedLocationLookup,
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
    itemNumber: row.itemNumber,
    locationId: row.locationId === "" ? null : row.locationId,
    warehouseId: row.warehouseId,
    isImported: row.isImported,
  }
}

function collectReferencedLocationIds(diff: StagedInventoryRowsDiff): string[] {
  const ids = new Set<string>()
  for (const draft of diff.added) {
    if (draft.locationId) ids.add(draft.locationId)
  }
  for (const update of diff.modified) {
    if (update.patch.locationId) ids.add(update.patch.locationId)
  }
  return Array.from(ids)
}

function patchToDbUpdate(
  patch: StagedInventoryRowUpdatePatch,
): UpdateStagedInventoryRecordInput {
  const data: UpdateStagedInventoryRecordInput = {}
  if (patch.productId !== undefined) data.productId = patch.productId
  if (patch.itemNumber !== undefined) data.itemNumber = patch.itemNumber
  if (patch.dyeLot !== undefined) data.dyeLot = patch.dyeLot
  if (patch.warehouseId !== undefined) data.warehouseId = patch.warehouseId
  if (patch.locationId !== undefined) data.locationId = patch.locationId
  if (patch.startingStock !== undefined) data.startingStock = patch.startingStock
  if (patch.notes !== undefined) data.notes = patch.notes
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

    const referencedLocationIds = collectReferencedLocationIds(diff)
    const locations: DiffStagedLocationLookup[] = []
    for (const id of referencedLocationIds) {
      const location = await getLocationById(id, c)
      if (location) {
        locations.push({ id: location.id, warehouseId: location.warehouseId })
      }
    }

    const products = await listProducts(c)
    const knownProductIds = products.map((p) => p.id)

    const parentContext: StagedInventoryParentContext = {
      importEntryId,
      warehouseId: parent.warehouseId,
    }

    const issues = validateStagedInventoryRowsDiff(
      diff,
      { existing, locations, knownProductIds },
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
        itemNumber: draft.itemNumber,
        dyeLot: draft.dyeLot,
        warehouseId: draft.warehouseId,
        locationId: draft.locationId,
        startingStock: draft.startingStock,
        // cost / freight aren't user-editable in V1 — write null here.
        // ETL paths that set cost/freight write via the data-layer repo
        // directly, not through this use case.
        cost: null,
        freight: null,
        notes: draft.notes,
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
