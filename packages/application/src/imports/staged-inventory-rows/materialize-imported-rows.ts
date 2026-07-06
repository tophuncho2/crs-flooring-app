import { randomUUID } from "node:crypto"
import {
  Prisma,
  listStagedInventoryForMaterialization,
  listStagedInventoryStatusesByIds,
  lockImportRow,
  materializeStagedRowsToInventory,
  withDatabaseTransaction,
  type MaterializeInventoryRowFields,
} from "@builders/db"
import { type ImportMaterializeBatchPayload } from "@builders/domain"
import { StagedInventoryExecutionError } from "./errors.js"
import type { MaterializeImportedStagedRowsResult } from "./types.js"

export async function materializeImportedStagedRowsUseCase(
  payload: ImportMaterializeBatchPayload,
  client?: Prisma.TransactionClient,
): Promise<MaterializeImportedStagedRowsResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    await lockImportRow(c, payload.importEntryId)

    // Classify every requested id by its CURRENT status (the parent FOR UPDATE
    // lock above freezes these for the rest of the transaction). This is the
    // idempotency backstop: a duplicate / reclaimed / stalled re-run finds its
    // rows already IMPORTED (or reset to DRAFT) and skips them instead of
    // dead-lettering a batch that already succeeded.
    const statuses = await listStagedInventoryStatusesByIds(c, {
      importEntryId: payload.importEntryId,
      ids: payload.stagedRowIds,
    })
    const statusById = new Map(statuses.map((row) => [row.id, row.status]))

    // An id that doesn't resolve at all doesn't belong to this import — a real
    // anomaly, never a benign skip. Fail terminal so it surfaces for
    // investigation and creates zero rows.
    const absentIds = payload.stagedRowIds.filter((id) => !statusById.has(id))
    if (absentIds.length > 0) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_MATERIALIZE_PRECONDITION_FAILED",
        message:
          "Staged rows referenced by this batch no longer exist on the import. Batch is not applicable.",
        status: 409,
        payload: {
          expectedCount: payload.stagedRowIds.length,
          missingIds: absentIds,
        },
      })
    }

    // Materialize only the still-QUEUED subset; IMPORTED / DRAFT rows are
    // already-handled and left untouched. If nothing is QUEUED, the whole batch
    // is a clean idempotent no-op.
    const queuedIds = payload.stagedRowIds.filter((id) => statusById.get(id) === "QUEUED")
    if (queuedIds.length === 0) {
      return { created: [], materializedStagedRowIds: [] }
    }

    const loadedRows = await listStagedInventoryForMaterialization(c, {
      importEntryId: payload.importEntryId,
      ids: queuedIds,
    })

    // The staged rows carry their OWN unit FK (UoM epic 2B) — the worker
    // materializes it forward verbatim (no re-derivation from the product).
    // The importability gate blocks a null-unit row from ever reaching QUEUED,
    // so a null here means a precondition regression, not a normal state.
    const rowsMissingUnit = loadedRows.filter((row) => !row.unitId)
    if (rowsMissingUnit.length > 0) {
      throw new StagedInventoryExecutionError({
        code: "STAGED_MATERIALIZE_PRECONDITION_FAILED",
        message:
          "Staged rows are missing a unit and cannot be materialized. Assign a unit to every row before importing.",
        status: 409,
        payload: { missingIds: rowsMissingUnit.map((row) => row.id) },
      })
    }

    const inventoryRowsToCreate: Array<
      MaterializeInventoryRowFields & { id: string; stagedRowId: string }
    > = loadedRows.map((row) => ({
      id: randomUUID(),
      // Correlation-only handle for the QUEUED->IMPORTED status flip (the
      // inventory->staged FK was severed; nothing is written back).
      stagedRowId: row.id,
      importEntryId: payload.importEntryId,
      productId: row.productId,
      // Non-null: the `rowsMissingUnit` guard above rejects the batch otherwise.
      unitId: row.unitId as string,
      rollPrefix: row.rollPrefix,
      rollNumber: row.rollNumber,
      dyeLot: row.dyeLot,
      note: row.note,
      internalNotes: null,
      // Warehouse is parent-owned — sourced from the import entry, not the
      // staged row (which no longer stores its own warehouseId).
      warehouseId: row.importEntry.warehouseId,
      location: row.location,
      startingStock: row.startingStock.toString(),
      cost: row.cost,
      freight: row.freight,
      createdBy: payload.requestedBy.userEmail,
      updatedBy: payload.requestedBy.userEmail,
    }))

    const result = await materializeStagedRowsToInventory(c, {
      importEntryId: payload.importEntryId,
      inventoryRowsToCreate,
    })

    return {
      created: result.created,
      materializedStagedRowIds: result.materializedStagedRowIds,
    }
  })
}
