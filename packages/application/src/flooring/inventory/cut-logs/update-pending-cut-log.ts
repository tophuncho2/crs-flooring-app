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

/**
 * Synchronous update for a single pending cut log. Callable from both
 * the WO and inventory side panels via the `scope` discriminator.
 * Single TX:
 *   1. Read cut log + parent inventory in one round trip.
 *   2. Scope assertion (cut log belongs to the scope passed by the route).
 *   3. Pending-status gate (final / void rows reject here).
 *   4. OCC against `expectedUpdatedAt`.
 *   5. If `patch.link` is present: assert symmetry + WOMI ownership of
 *      the re-link target.
 *   6. Per-row form validation against the merged post-patch state.
 *   7. Lock the parent inventory FOR UPDATE.
 *   8. Build the row patch (re-derive `coverageCut` only when `cut`
 *      changed; always re-snap `location` from the parent inventory —
 *      denormalized-mirror semantics).
 *   9. Apply the patch.
 *  10. Recompute `totalCutSum` + invariant.
 *
 * WOMI status is not consulted — the inventory row lock is the sole
 * concurrency mechanism.
 */
export async function updatePendingCutLogUseCase(
  input: UpdatePendingCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<CutLogMutationResult> {
  // Pre-TX: link-symmetry + relink-target lookup. The WOMI read is
  // read-only validation against immutable snapshots (WO.warehouseId and
  // WOMI.productId never change post-create), so doing it outside the
  // interactive transaction keeps the in-TX work below Prisma's 5s
  // default budget. The TX below re-confirms the cut log's snapshot
  // matches what we resolved here.
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
      // FlooringWorkOrder.warehouseId is nullable in the schema, but cut
      // logs require a non-null warehouse snapshot — a WO without a
      // warehouse cannot be a relink target.
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

    // 1. Read cut log + parent inventory in one round trip.
    const found = await getPendingCutLogWithInventoryForMutation(c, input.cutLogId)
    if (!found) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
        message: "Cut log not found",
        status: 404,
      })
    }
    const { cutLog: existing, inventory } = found

    // 2. Scope assertion.
    assertCutLogScope(input.scope, {
      workOrderId: existing.workOrderId,
      inventoryId: existing.inventoryId,
    })

    // 3. Mutation gate — split by patch kind:
    //    - Field patches (cut / isWaste / notes) require PENDING-editable.
    //    - Link patches (workOrderId / workOrderItemId) allow PENDING or
    //      FINAL — voided / queued rows still reject. This is how a
    //      finalized cut log gets re-linked to a different WO/WOMI without
    //      ever leaving FINAL.
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

    // 4. Optimistic concurrency check.
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

    // 5. Link patch — defense-in-depth scope guards. WOMI symmetry +
    //    target-WO ownership were validated pre-TX; here we compare the
    //    pre-resolved target against the cut log's frozen snapshot
    //    (warehouseId + productId) which we just read inside the TX.
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

    // 6. Per-row form validation against the merged post-patch state.
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

    // 7. Lock the parent inventory.
    await lockInventoryForCutLog(c, existing.inventoryId)

    // 8. Build the row patch.
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
    // `location` is a denormalized mirror — always re-snap from the
    // parent inventory on update, regardless of which fields are in the
    // user-facing patch.
    patch.location = inventory.location

    // 9. Apply the patch.
    const cutLog = await updatePendingCutLogRow(c, { id: existing.id, patch })

    // 10. Recompute + invariant.
    const recomputed = await recomputeAndPersistTotalCutSums(c, [existing.inventoryId])
    const result = recomputed[0]
    if (!result) {
      throw new CutLogDomainError("CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK", {
        reason: "recompute returned no rows",
        inventoryId: existing.inventoryId,
      })
    }
    // Translate the domain "exceeds starting stock" error into a 400
    // execution error so the route handler surfaces it as a user-
    // friendly message instead of "Unexpected server error".
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
