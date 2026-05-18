import { randomUUID } from "node:crypto"
import {
  Prisma,
  listStagedInventoryForMaterialization,
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

/**
 * Worker-side materialize: drains a batch of QUEUED staged rows into real
 * inventory rows. Snapshot-heavy by design — every denormalized column on
 * `flooring_inventory` (productName, categoryName, importNumber,
 * purchaseOrderNumber, UoM × 6, coveragePerUnit) is stamped here from the
 * joined product + import entry context.
 *
 * Field sourcing rules:
 *   - `productName`: `product.name` directly (the stored display name —
 *     "category style color note" composed at product create time).
 *   - `categorySlug`, `categoryName`: from `product.category`.
 *   - 6 UoM columns: from `product.{stockUnit*, itemCoverageUnit*, sendUnit*}`
 *     (the product table carries denormalized UoM snapshots — no need to
 *     hop to category).
 *   - `coveragePerUnit`: from `product.coveragePerUnit`.
 *   - `importNumber`: raw stringified `Int` from `importEntry.importNumber`
 *     (UI re-formats via `formatInventoryImportNumber`).
 *   - `purchaseOrderNumber`: from `importEntry.purchaseOrderNumber`.
 *   - `internalNotes`: always `null` — user-only column, never seeded by
 *     the worker.
 *   - `rollPrefix` + `rollNumber`: both copied verbatim from the staged
 *     row. The staged row stores the prefix in its own column (default
 *     `"ROLL#"`) and the user-typed bare suffix in `rollNumber`; the
 *     resulting inventory row inherits both directly. No server-side
 *     prefix composition happens here or in the staged save use case.
 *   - `inventoryItem`: written as `""` here; the data-layer primitive
 *     composes the canonical value after `inventoryNumber` is
 *     sequence-assigned (see `materializeStagedRowsToInventory` step 2.5).
 *   - `fifoReceivedAt`: `new Date()` — UTC; the column is TIMESTAMPTZ and
 *     the UI formats in Eastern Time on read.
 *
 * Locking: the import-entry row is locked FOR UPDATE for the duration of
 * the transaction. Inventory rows being created don't need a lock — they
 * don't exist yet, and concurrent cut-log mutations against them can only
 * start after this transaction commits.
 */
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
