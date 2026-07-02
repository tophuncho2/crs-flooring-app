import { randomUUID } from "node:crypto"
import {
  Prisma,
  listStagedInventoryForMaterialization,
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

    const loadedRows = await listStagedInventoryForMaterialization(c, {
      importEntryId: payload.importEntryId,
      ids: payload.stagedRowIds,
    })

    if (loadedRows.length !== payload.stagedRowIds.length) {
      const loadedIds = new Set(loadedRows.map((row) => row.id))
      const missingIds = payload.stagedRowIds.filter((id) => !loadedIds.has(id))
      throw new StagedInventoryExecutionError({
        code: "STAGED_MATERIALIZE_PRECONDITION_FAILED",
        message:
          "Staged rows changed state before materialization could complete. Batch is no longer applicable.",
        status: 409,
        payload: {
          expectedCount: payload.stagedRowIds.length,
          actualCount: loadedRows.length,
          missingIds,
        },
      })
    }

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
      MaterializeInventoryRowFields & { id: string; sourceStagedRowId: string }
    > = loadedRows.map((row) => ({
      id: randomUUID(),
      sourceStagedRowId: row.id,
      importEntryId: payload.importEntryId,
      productId: row.productId,
      // Non-null: the `rowsMissingUnit` guard above rejects the batch otherwise.
      unitId: row.unitId as string,
      rollPrefix: row.rollPrefix,
      rollNumber: row.rollNumber,
      dyeLot: row.dyeLot,
      note: row.note,
      internalNotes: null,
      warehouseId: row.warehouseId,
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
