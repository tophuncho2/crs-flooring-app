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

    const fifoReceivedAt = new Date()

    const inventoryRowsToCreate: Array<
      MaterializeInventoryRowFields & { id: string; sourceStagedRowId: string }
    > = loadedRows.map((row) => ({
      id: randomUUID(),
      sourceStagedRowId: row.id,
      importEntryId: payload.importEntryId,
      importNumber: String(row.importEntry.importNumber),
      purchaseOrderNumber: row.importEntry.purchaseOrderNumber ?? null,
      productId: row.productId,
      categorySlug: row.product.category.slug,
      categoryName: row.product.category.name,
      stockUnitName: row.product.stockUnitName,
      stockUnitAbbrev: row.product.stockUnitAbbrev,
      sendUnitName: row.product.sendUnitName,
      sendUnitAbbrev: row.product.sendUnitAbbrev,
      rollPrefix: row.rollPrefix,
      rollNumber: row.rollNumber,
      dyeLot: row.dyeLot,
      note: row.note,
      internalNotes: null,
      inventoryItem: "",
      warehouseId: row.warehouseId,
      location: row.location,
      startingStock: row.startingStock.toString(),
      cost: row.cost,
      freight: row.freight,
      fifoReceivedAt,
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
