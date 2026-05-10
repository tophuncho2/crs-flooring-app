import { randomUUID } from "node:crypto"
import {
  Prisma,
  listStagedInventoryForMaterialization,
  materializeStagedRowsToInventory,
  withDatabaseTransaction,
  type CreateInventoryRecordInput,
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

    // Hardscoped — placeholder until the worker stabilization sweep rewrites
    // this use case to: pull UoM snapshots from the product (not category),
    // compose `inventoryItem` via `composeInventoryItem`, apply
    // `applyRollNumberPrefix` to `rollNumber`, and populate every snapshot
    // column from the staged row + import entry context. For now this stub
    // only exists to keep the build green; the worker is not run.
    const inventoryRowsToCreate: Array<
      CreateInventoryRecordInput & { id: string; sourceStagedRowId: string }
    > = loadedRows.map((row) => {
      const startingStock = row.startingStock.toString()
      const category = row.product.category
      return {
        id: randomUUID(),
        sourceStagedRowId: row.id,
        importEntryId: payload.importEntryId,
        importNumber: null,
        purchaseOrderNumber: null,
        productId: row.productId,
        productName: "",
        categorySlug: category.slug,
        categoryName: "",
        stockUnitName: category.stockUnit?.name ?? null,
        stockUnitAbbrev: category.stockUnit?.abbreviation ?? null,
        itemCoverageUnitName: category.itemCoverageUnit?.name ?? null,
        itemCoverageUnitAbbrev: category.itemCoverageUnit?.abbreviation ?? null,
        sendUnitName: category.sendUnit?.name ?? null,
        sendUnitAbbrev: category.sendUnit?.abbreviation ?? null,
        coveragePerUnit: decimalToString(row.product.coveragePerUnit),
        rollNumber: row.rollNumber,
        dyeLot: row.dyeLot,
        note: row.note,
        internalNotes: null,
        inventoryItem: "",
        warehouseId: row.warehouseId,
        location: row.location,
        startingStock,
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
