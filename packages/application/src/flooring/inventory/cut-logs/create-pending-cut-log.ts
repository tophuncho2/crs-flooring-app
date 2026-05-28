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

export async function createPendingCutLogUseCase(
  input: CreatePendingCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<CutLogMutationResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

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

    assertCutLogLinkageSymmetry({
      workOrderId: input.workOrderId,
      workOrderItemId: input.workOrderItemId,
    })

    await lockInventoryForCutLog(c, input.inventoryId)

    const inventory = await getInventoryParentContextForCutLogs(c, input.inventoryId)
    if (!inventory) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
        message: "Parent inventory not found",
        status: 404,
        payload: { inventoryId: input.inventoryId },
      })
    }

    const coverageCut = deriveCutLogCoverageCutString({
      cut: input.cut,
      coveragePerUnit: inventory.coveragePerUnit,
      categorySlug: inventory.categorySlug,
    })

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
        productId: inventory.productId,
        productName: inventory.productName,
        warehouseId: inventory.warehouseId,
      }),
      location: inventory.location,
    })

    const recomputed = await recomputeAndPersistTotalCutSums(c, [input.inventoryId])
    const result = recomputed[0]
    if (!result) {
      throw new CutLogDomainError("CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK", {
        reason: "recompute returned no rows",
        inventoryId: input.inventoryId,
      })
    }

    try {
      assertCutSumWithinStartingStock({
        totalCutSum: result.totalCutSum,
        startingStock: inventory.startingStock,
      })
    } catch (error) {
      if (
        error instanceof CutLogDomainError &&
        error.code === "CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK"
      ) {
        const unit = inventory.stockUnitAbbrev ? ` ${inventory.stockUnitAbbrev}` : ""
        throw new CutLogExecutionError({
          code: "CUT_LOG_EXCEEDS_INVENTORY",
          message: `Cut exceeds available inventory: total cuts would be ${result.totalCutSum}${unit} but only ${inventory.startingStock}${unit} is available.`,
          status: 400,
          payload: {
            inventoryId: result.inventoryId,
            totalCutSum: result.totalCutSum,
            startingStock: inventory.startingStock,
          },
        })
      }
      throw error
    }

    return {
      cutLog,
      inventoryId: result.inventoryId,
      totalCutSum: result.totalCutSum,
    }
  })
}
