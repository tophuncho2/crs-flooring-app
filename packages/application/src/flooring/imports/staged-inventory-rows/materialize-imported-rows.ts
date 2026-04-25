import { randomUUID } from "node:crypto"
import {
  Prisma,
  listStagedInventoryForMaterialization,
  materializeStagedRowsToInventory,
  withDatabaseTransaction,
  type CreateInventoryRecordInput,
} from "@builders/db"
import {
  computeCostPerUnit,
  computeFreightPerUnit,
  type ImportMaterializeBatchPayload,
} from "@builders/domain"
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

    await c.$queryRaw(
      Prisma.sql`SELECT "id" FROM "flooring_import_entry" WHERE "id" = ${payload.importEntryId} FOR UPDATE`,
    )

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
      CreateInventoryRecordInput & { id: string; sourceStagedRowId: string }
    > = loadedRows.map((row) => {
      const startingStock = row.startingStock.toString()
      const cost = decimalToString(row.cost)
      const freight = decimalToString(row.freight)
      const category = row.product.category
      return {
        id: randomUUID(),
        sourceStagedRowId: row.id,
        importEntryId: payload.importEntryId,
        productId: row.productId,
        categorySlug: category.slug,
        stockUnitName: category.stockUnit?.name ?? null,
        stockUnitAbbrev: category.stockUnit?.abbreviation ?? null,
        itemCoverageUnitName: category.itemCoverageUnit?.name ?? null,
        itemCoverageUnitAbbrev: category.itemCoverageUnit?.abbreviation ?? null,
        sendUnitName: category.sendUnit?.name ?? null,
        sendUnitAbbrev: category.sendUnit?.abbreviation ?? null,
        coveragePerUnit: decimalToString(row.product.coveragePerUnit),
        itemNumber: row.itemNumber,
        dyeLot: row.dyeLot,
        warehouseId: row.warehouseId,
        locationId: row.locationId,
        startingStock,
        cost,
        freight,
        costPerUnit: computeCostPerUnit({ cost, startingStock }),
        freightPerUnit: computeFreightPerUnit({ freight, startingStock }),
        notes: row.notes,
        fifoReceivedAt,
      }
    })

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
