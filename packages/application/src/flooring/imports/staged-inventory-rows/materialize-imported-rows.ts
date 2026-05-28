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

function decimalToString(
  value: { toString(): string } | null | undefined,
): string | null {
  if (value === null || value === undefined) return null
  return value.toString()
}

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
      productName: row.product.name,
      categorySlug: row.product.category.slug,
      categoryName: row.product.category.name,
      stockUnitName: row.product.stockUnitName,
      stockUnitAbbrev: row.product.stockUnitAbbrev,
      itemCoverageUnitName: row.product.itemCoverageUnitName,
      itemCoverageUnitAbbrev: row.product.itemCoverageUnitAbbrev,
      sendUnitName: row.product.sendUnitName,
      sendUnitAbbrev: row.product.sendUnitAbbrev,
      coveragePerUnit: decimalToString(row.product.coveragePerUnit),
      rollPrefix: row.rollPrefix,
      rollNumber: row.rollNumber,
      dyeLot: row.dyeLot,
      note: row.note,
      internalNotes: null,
      inventoryItem: "",
      warehouseId: row.warehouseId,
      location: row.location,
      startingStock: row.startingStock.toString(),
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
