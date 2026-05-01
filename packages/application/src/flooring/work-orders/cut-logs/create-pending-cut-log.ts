import {
  Prisma,
  getInventoryParentContextForCutLogs,
  insertPendingCutLogRow,
  lockInventoriesForCutLogBatch,
  recomputeAndPersistTotalCutSums,
  withDatabaseTransaction,
  type CutLogRecord,
} from "@builders/db"
import {
  assertCutLogLinkageSymmetry,
  assertCutSumWithinStartingStock,
  assertWorkOrderItemReadyForCutLogMutation,
  CutLogDomainError,
  WorkOrderDomainError,
  deriveCutLogCoverageCutString,
  describeCutLogPendingFormIssues,
  validateCutLogPendingForm,
  type CreatePendingCutLogInput,
} from "@builders/domain"
import { WorkOrderCutLogExecutionError } from "./errors.js"

/**
 * Synchronous create for a pending cut log scoped to one WOMI. Single
 * TX:
 *   1. Per-row form validation (`validateCutLogPendingForm`) — `cut`
 *      must be a positive number.
 *   2. WOMI ownership + status check (status === IDLE).
 *   3. Linkage symmetry assertion.
 *   4. Lock the parent inventory FOR UPDATE.
 *   5. Read the inventory parent context (startingStock,
 *      categorySlug, coveragePerUnit, four unit-snapshot fields).
 *   6. Derive `coverageCut` via the domain helper.
 *   7. Insert the row, stamping the four unit-snapshot fields from
 *      the inventory read.
 *   8. Recompute the inventory's `totalCutSum`.
 *   9. Assert `totalCutSum ≤ startingStock` (domain error bubbles).
 *
 * Returns the inserted cut log (full normalized record).
 */
export async function createPendingCutLogUseCase(
  input: CreatePendingCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<{ cutLog: CutLogRecord; inventoryId: string; totalCutSum: string }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    // 1. Per-row form validation.
    const formIssues = validateCutLogPendingForm({
      cut: input.cut,
      cost: null,
      freight: null,
      isWaste: input.isWaste,
      notes: input.notes,
    })
    if (formIssues.length > 0) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_VALIDATION_FAILED",
        message: describeCutLogPendingFormIssues(formIssues),
        status: 400,
        payload: { issues: formIssues },
      })
    }

    // 2. Read WOMI; assert ownership + IDLE.
    const womi = await c.flooringWorkOrderItem.findUnique({
      where: { id: input.workOrderItemId },
      select: { id: true, workOrderId: true, status: true },
    })
    if (!womi) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_NOT_FOUND",
        message: "Work order material item not found",
        status: 404,
      })
    }
    if (womi.workOrderId !== input.workOrderId) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH",
        message: "Material item does not belong to this work order",
        status: 400,
        payload: {
          providedWorkOrderId: input.workOrderId,
          actualWorkOrderId: womi.workOrderId,
        },
      })
    }
    try {
      assertWorkOrderItemReadyForCutLogMutation({ status: womi.status })
    } catch (error) {
      if (error instanceof WorkOrderDomainError) {
        throw new WorkOrderCutLogExecutionError({
          code: "WORK_ORDER_ITEM_NOT_IDLE",
          message:
            "Material item is currently busy with another cut-log operation",
          status: 409,
          payload: { status: womi.status, cause: String(error) },
        })
      }
      throw error
    }

    // 3. Linkage symmetry.
    assertCutLogLinkageSymmetry({
      workOrderId: input.workOrderId,
      workOrderItemId: input.workOrderItemId,
    })

    // 4. Lock the parent inventory.
    await lockInventoriesForCutLogBatch(c, [input.inventoryId])

    // 5. Read inventory context (post-lock).
    const inventory = await getInventoryParentContextForCutLogs(c, input.inventoryId)
    if (!inventory) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_NOT_FOUND",
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

    // 7. Insert the row, stamping the unit snapshot from the inventory.
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
    })

    // 8. Recompute totalCutSum.
    const recomputed = await recomputeAndPersistTotalCutSums(c, [input.inventoryId])
    const result = recomputed[0]
    if (!result) {
      // Defensive — recompute always returns a row when we passed an id.
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
