import {
  Prisma,
  db,
  getPendingCutLogWithInventoryForMutation,
  lockInventoryForCutLog,
  recomputeAndPersistTotalCutSums,
  updatePendingCutLogRow,
  withDatabaseTransaction,
  type UpdatePendingCutLogRowPatch,
} from "@builders/db"
import {
  assertCutLogExpectedUpdatedAtMatches,
  assertCutLogLinkMutationAllowed,
  assertCutLogLinkageSymmetry,
  assertCutLogPendingMutationAllowed,
  assertCutSumWithinStartingStock,
  CutLogDomainError,
  deriveCutLogCoverageCutString,
  describeCutLogPendingFormIssues,
  validateCutLogPendingForm,
} from "@builders/domain"
import { CutLogExecutionError } from "./errors.js"
import { assertCutLogScope } from "./scope.js"
import type {
  CutLogMutationResult,
  UpdatePendingCutLogInput,
} from "./types.js"

export async function updatePendingCutLogUseCase(
  input: UpdatePendingCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<CutLogMutationResult> {
  let resolvedWomiTarget: {
    workOrderId: string
    workOrderItemId: string
    workOrderWarehouseId: string
    productId: string
  } | null = null
  if (input.patch.link !== undefined) {
    assertCutLogLinkageSymmetry(input.patch.link)
    if (input.patch.link.workOrderId !== null) {
      const womi = await db.flooringWorkOrderItem.findUnique({
        where: { id: input.patch.link.workOrderItemId! },
        select: {
          id: true,
          workOrderId: true,
          productId: true,
          workOrder: { select: { warehouseId: true } },
        },
      })
      if (!womi) {
        throw new CutLogExecutionError({
          code: "CUT_LOG_NOT_FOUND",
          message: "Re-link target work-order material item not found",
          status: 404,
          payload: { workOrderItemId: input.patch.link.workOrderItemId },
        })
      }
      if (womi.workOrderId !== input.patch.link.workOrderId) {
        throw new CutLogExecutionError({
          code: "CUT_LOG_SCOPE_MISMATCH",
          message:
            "Re-link target material item does not belong to the provided work order",
          status: 400,
          payload: {
            providedWorkOrderId: input.patch.link.workOrderId,
            actualWorkOrderId: womi.workOrderId,
          },
        })
      }
      if (womi.workOrder.warehouseId === null) {
        throw new CutLogExecutionError({
          code: "CUT_LOG_LINK_SCOPE_MISMATCH",
          message: "Re-link target work order has no warehouse assigned",
          status: 400,
          payload: { targetWorkOrderId: womi.workOrderId },
        })
      }
      resolvedWomiTarget = {
        workOrderId: womi.workOrderId,
        workOrderItemId: womi.id,
        workOrderWarehouseId: womi.workOrder.warehouseId,
        productId: womi.productId,
      }
    }
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const found = await getPendingCutLogWithInventoryForMutation(c, input.cutLogId)
    if (!found) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
        message: "Cut log not found",
        status: 404,
      })
    }
    const { cutLog: existing, inventory } = found

    assertCutLogScope(input.scope, {
      workOrderId: existing.workOrderId,
      inventoryId: existing.inventoryId,
    })

    const hasLinkPatch = input.patch.link !== undefined
    const hasFieldPatch =
      input.patch.cut !== undefined ||
      input.patch.isWaste !== undefined ||
      input.patch.notes !== undefined
    if (hasFieldPatch) {
      try {
        assertCutLogPendingMutationAllowed({
          status: existing.status,
          isFinal: existing.isFinal,
          void: existing.void,
        })
      } catch (error) {
        if (error instanceof CutLogDomainError) {
          throw new CutLogExecutionError({
            code: "CUT_LOG_NOT_PENDING",
            message:
              "Cut log cannot be edited; it has been finalized or voided",
            status: 409,
            payload: {
              cutLogId: existing.id,
              status: existing.status,
              isFinal: existing.isFinal,
              void: existing.void,
            },
          })
        }
        throw error
      }
    }
    if (hasLinkPatch) {
      try {
        assertCutLogLinkMutationAllowed({
          status: existing.status,
          void: existing.void,
        })
      } catch (error) {
        if (error instanceof CutLogDomainError) {
          throw new CutLogExecutionError({
            code: "CUT_LOG_LINK_NOT_ALLOWED",
            message:
              "Cut log link cannot be changed; it has been voided or a worker job is in flight",
            status: 409,
            payload: {
              cutLogId: existing.id,
              status: existing.status,
              void: existing.void,
            },
          })
        }
        throw error
      }
    }

    try {
      assertCutLogExpectedUpdatedAtMatches({
        rowUpdatedAt: existing.updatedAt,
        expected: input.expectedUpdatedAt,
      })
    } catch (error) {
      if (error instanceof CutLogDomainError) {
        throw new CutLogExecutionError({
          code: "CUT_LOG_STALE",
          message:
            "Cut log was modified by someone else; refresh and try again",
          status: 409,
          payload: {
            cutLogId: existing.id,
            expected: input.expectedUpdatedAt,
            actual: existing.updatedAt,
          },
        })
      }
      throw error
    }

    if (resolvedWomiTarget !== null) {
      if (resolvedWomiTarget.workOrderWarehouseId !== existing.warehouseId) {
        throw new CutLogExecutionError({
          code: "CUT_LOG_LINK_SCOPE_MISMATCH",
          message:
            "Re-link target work order is in a different warehouse than the cut log",
          status: 400,
          payload: {
            cutLogWarehouseId: existing.warehouseId,
            targetWarehouseId: resolvedWomiTarget.workOrderWarehouseId,
          },
        })
      }
      if (resolvedWomiTarget.productId !== existing.productId) {
        throw new CutLogExecutionError({
          code: "CUT_LOG_LINK_SCOPE_MISMATCH",
          message:
            "Re-link target material item is for a different product than the cut log",
          status: 400,
          payload: {
            cutLogProductId: existing.productId,
            targetProductId: resolvedWomiTarget.productId,
          },
        })
      }
    }

    const mergedCut = input.patch.cut !== undefined ? input.patch.cut : existing.cut
    const mergedIsWaste =
      input.patch.isWaste !== undefined ? input.patch.isWaste : existing.isWaste
    const mergedNotes = input.patch.notes !== undefined ? input.patch.notes : existing.notes
    const formIssues = validateCutLogPendingForm({
      cut: mergedCut,
      isWaste: mergedIsWaste,
      notes: mergedNotes,
    })
    if (formIssues.length > 0) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_VALIDATION_FAILED",
        message: describeCutLogPendingFormIssues(formIssues),
        status: 400,
        payload: { issues: formIssues },
      })
    }

    await lockInventoryForCutLog(c, existing.inventoryId)

    const patch: UpdatePendingCutLogRowPatch = {}
    if (input.patch.cut !== undefined) {
      patch.cut = input.patch.cut
      patch.coverageCut = deriveCutLogCoverageCutString({
        cut: input.patch.cut,
        coveragePerUnit: inventory.coveragePerUnit,
        categorySlug: inventory.categorySlug,
      })
    }
    if (input.patch.isWaste !== undefined) patch.isWaste = input.patch.isWaste
    if (input.patch.notes !== undefined) patch.notes = input.patch.notes
    if (input.patch.link !== undefined) {
      patch.workOrderId = input.patch.link.workOrderId
      patch.workOrderItemId = input.patch.link.workOrderItemId
    }
    patch.location = inventory.location

    const cutLog = await updatePendingCutLogRow(c, { id: existing.id, patch })

    const recomputed = await recomputeAndPersistTotalCutSums(c, [existing.inventoryId])
    const result = recomputed[0]
    if (!result) {
      throw new CutLogDomainError("CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK", {
        reason: "recompute returned no rows",
        inventoryId: existing.inventoryId,
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
