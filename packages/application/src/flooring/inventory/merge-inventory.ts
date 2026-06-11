import {
  Prisma,
  getInventoryRowsForMerge,
  getProductById,
  getWarehouseById,
  insertInventoryRow,
  lockInventoryRow,
  markInventoryRowsMerged,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertMergeSources,
  assertMergeSourcesEligible,
  buildCreatedInventoryInsert,
  describeInventoryCreateIssues,
  InventoryDomainError,
  sumMergedStartingStock,
  validateCreateInventoryEdits,
} from "@builders/domain"
import { InventoryExecutionError } from "./errors.js"
import type { InventoryResult, MergeInventoryInput } from "./types.js"

/**
 * Merge several existing inventory rows of one product into a single new row.
 *
 * One transaction, in order:
 *  1. de-dupe + lock every source row (`FOR UPDATE`, sorted by id to avoid
 *     deadlocks — the shared `lockInventoryRow` primitive),
 *  2. read the locked sources and assert the single-product invariant
 *     (`assertMergeSources` — the cardinal "never cross products in one merge"
 *     rule, also enforced client-side by resetting selection on product change),
 *  3. resolve the product snapshot + the operator-chosen warehouse,
 *  4. compute `startingStock` = Σ remaining balance of the sources (adjustments
 *     do NOT carry over; the new row opens at this balance with netDeducted 0),
 *  5. insert the merged row (import provenance null via `buildCreatedInventoryInsert`,
 *     createdAt + fifoReceivedAt stamped from one instant like the create path),
 *  6. flag every source row `wasMerged = true` (status only — sources stay
 *     fully editable; a future sweep drops delete restrictions for cleanup).
 *
 * Synchronous — no worker, no outbox. The merged row itself is `wasMerged=false`.
 */
export async function mergeInventoryUseCase(
  input: MergeInventoryInput,
  client?: Prisma.TransactionClient,
): Promise<InventoryResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    // De-dupe + sort so a row referenced twice locks once and concurrent merges
    // acquire locks in a consistent order.
    const sourceIds = [...new Set(input.sourceInventoryIds)].sort()

    // Lock every source row before reading it so the product check + balance sum
    // see a stable snapshot for the life of the transaction.
    for (const id of sourceIds) {
      await lockInventoryRow(c, id)
    }

    const sources = await getInventoryRowsForMerge(sourceIds, c)
    if (sources.length !== sourceIds.length) {
      throw new InventoryExecutionError({
        code: "INVENTORY_NOT_FOUND",
        message: "One or more inventory rows to merge were not found.",
        status: 404,
      })
    }

    // The cardinal invariant: ≥2 sources, all the same product; plus per-row
    // eligibility (no zero-balance or already-merged source). Domain rules throw
    // named errors; translate them to the HTTP-aware execution error.
    try {
      assertMergeSources(sources, input.productId)
      assertMergeSourcesEligible(sources)
    } catch (error) {
      if (error instanceof InventoryDomainError) {
        throw new InventoryExecutionError({
          code:
            error.code === "INVENTORY_MERGE_CROSS_PRODUCT" ||
            error.code === "INVENTORY_MERGE_ZERO_BALANCE_SOURCE" ||
            error.code === "INVENTORY_MERGE_ALREADY_MERGED_SOURCE"
              ? error.code
              : "INVENTORY_MERGE_TOO_FEW_SOURCES",
          message: error.message,
          status: 422,
        })
      }
      throw error
    }

    const product = await getProductById(input.productId, c)
    if (!product) {
      throw new InventoryExecutionError({
        code: "INVENTORY_PRODUCT_NOT_FOUND",
        message: "Product not found.",
        status: 404,
      })
    }

    const warehouse = await getWarehouseById(input.warehouseId, c)
    if (!warehouse) {
      throw new InventoryExecutionError({
        code: "INVENTORY_WAREHOUSE_NOT_FOUND",
        message: "Warehouse not found.",
        status: 404,
      })
    }

    // Σ remaining balance across the (now locked) sources — the new row's
    // starting stock. Computed here, not trusted from the client.
    const startingStock = sumMergedStartingStock(sources)

    const edits = {
      productId: input.productId,
      warehouseId: input.warehouseId,
      rollNumber: input.rollNumber,
      dyeLot: input.dyeLot,
      note: input.note,
      startingStock,
      location: input.location,
      internalNotes: input.internalNotes,
    }

    const issues = validateCreateInventoryEdits(edits)
    if (issues.length > 0) {
      throw new InventoryExecutionError({
        code: "INVENTORY_VALIDATION_FAILED",
        message: describeInventoryCreateIssues(issues),
        status: 422,
        payload: { issues },
      })
    }

    const fields = buildCreatedInventoryInsert(
      {
        categorySlug: product.category.slug,
        categoryName: product.category.name,
        stockUnitName: product.stockUnitName,
        stockUnitAbbrev: product.stockUnitAbbrev,
        sendUnitName: product.sendUnitName,
        sendUnitAbbrev: product.sendUnitAbbrev,
      },
      edits,
    )

    // Stamp createdAt + fifoReceivedAt from the same instant so the merged row's
    // FIFO position matches its creation time exactly (mirrors the create path).
    const now = new Date()
    const merged = await insertInventoryRow(c, {
      ...fields,
      createdAt: now,
      fifoReceivedAt: now,
    })

    await markInventoryRowsMerged(c, sourceIds)

    return merged
  })
}
