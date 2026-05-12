import {
  Prisma,
  getInventoryParentContextForCutLogs,
  insertPendingCutLogRow,
  lockInventoryForCutLog,
  recomputeAndPersistTotalCutSums,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertCutLogLinkageSymmetry,
  assertCutSumWithinStartingStock,
  buildPendingCutLogInventorySnapshot,
  CutLogDomainError,
  deriveCutLogCoverageCutString,
  describeCutLogPendingFormIssues,
  validateCutLogPendingForm,
} from "@builders/domain"
import { CutLogExecutionError } from "./errors.js"
import type { CreatePendingCutLogInput, CutLogMutationResult } from "./types.js"

/**
 * Synchronous create for a pending cut log scoped to one WOMI. Cut logs
 * are only ever created on the WO side (grouped under WOMI rows in the
 * UI), so this use case has no scope discriminator. Single TX:
 *   1. Per-row form validation (`validateCutLogPendingForm`).
 *   2. WOMI ownership check (cut log links to the right WO).
 *   3. Linkage symmetry assertion.
 *   4. Lock the parent inventory FOR UPDATE.
 *   5. Read the inventory parent context (startingStock, categorySlug,
 *      coveragePerUnit, the four unit-snapshot fields, the 5 inventory-
 *      identity snapshot primitives, and `location`).
 *   6. Derive `coverageCut` via the domain helper.
 *   7. Insert the row, stamping the unit snapshot, the identity snapshot,
 *      and the `location` mirror from the inventory.
 *   8. Recompute the inventory's `totalCutSum`.
 *   9. Assert `totalCutSum ≤ startingStock` (domain error bubbles).
 *
 * WOMI status is not consulted — the parent inventory's row lock is the
 * sole concurrency mechanism.
 */
export async function createPendingCutLogUseCase(
  input: CreatePendingCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<CutLogMutationResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    // 1. Per-row form validation.
    const formIssues = validateCutLogPendingForm({
      cut: input.cut,
      isWaste: input.isWaste,
      notes: input.notes,
    })
    if (formIssues.length > 0) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_VALIDATION_FAILED",
        message: describeCutLogPendingFormIssues(formIssues),
        status: 400,
        payload: { issues: formIssues },
      })
    }

    // 2. Read WOMI; assert ownership.
    const womi = await c.flooringWorkOrderItem.findUnique({
      where: { id: input.workOrderItemId },
      select: { id: true, workOrderId: true },
    })
    if (!womi) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
        message: "Work order material item not found",
        status: 404,
      })
    }
    if (womi.workOrderId !== input.workOrderId) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_SCOPE_MISMATCH",
        message: "Material item does not belong to this work order",
        status: 400,
        payload: {
          providedWorkOrderId: input.workOrderId,
          actualWorkOrderId: womi.workOrderId,
        },
      })
    }

    // 3. Linkage symmetry.
    assertCutLogLinkageSymmetry({
      workOrderId: input.workOrderId,
      workOrderItemId: input.workOrderItemId,
    })

    // 4. Lock the parent inventory.
    await lockInventoryForCutLog(c, input.inventoryId)

    // 5. Read inventory context (post-lock).
    const inventory = await getInventoryParentContextForCutLogs(c, input.inventoryId)
    if (!inventory) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
        message: "Parent inventory not found",
        status: 404,
        payload: { inventoryId: input.inventoryId },
      })
    }

    // 6. Derive coverageCut.
    const coverageCut = deriveCutLogCoverageCutString({
      cut: input.cut,
      coveragePerUnit: inventory.coveragePerUnit,
      categorySlug: inventory.categorySlug,
    })

    // 7. Insert the row, stamping the unit + identity snapshots and the
    // `location` mirror from the inventory. Snapshots are frozen at
    // create (finalize/void do NOT re-stamp the identity primitives);
    // `location` is a denormalized mirror that re-snaps on update +
    // finalize and clears on void.
    const cutLog = await insertPendingCutLogRow(c, {
      workOrderId: input.workOrderId,
      workOrderItemId: input.workOrderItemId,
      inventoryId: input.inventoryId,
      cut: input.cut,
      coverageCut,
      isWaste: input.isWaste,
      notes: input.notes,
      unitSnapshot: {
        stockUnitName: inventory.stockUnitName,
        stockUnitAbbrev: inventory.stockUnitAbbrev,
        itemCoverageUnitName: inventory.itemCoverageUnitName,
        itemCoverageUnitAbbrev: inventory.itemCoverageUnitAbbrev,
      },
      inventorySnapshot: buildPendingCutLogInventorySnapshot({
        inventoryItem: inventory.inventoryItem,
        categorySlug: inventory.categorySlug,
        inventoryNumber: inventory.inventoryNumber,
        rollPrefix: inventory.rollPrefix,
        rollNumber: inventory.rollNumber,
        dyeLot: inventory.dyeLot,
        inventoryNote: inventory.inventoryNote,
      }),
      location: inventory.location,
    })

    // 8. Recompute totalCutSum.
    const recomputed = await recomputeAndPersistTotalCutSums(c, [input.inventoryId])
    const result = recomputed[0]
    if (!result) {
      throw new CutLogDomainError("CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK", {
        reason: "recompute returned no rows",
        inventoryId: input.inventoryId,
      })
    }

    // 9. Invariant assertion (domain error bubbles to API handler).
    assertCutSumWithinStartingStock({
      totalCutSum: result.totalCutSum,
      startingStock: inventory.startingStock,
    })

    return {
      cutLog,
      inventoryId: result.inventoryId,
      totalCutSum: result.totalCutSum,
    }
  })
}
