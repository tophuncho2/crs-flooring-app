import {
  Prisma,
  db,
  getPendingAdjustmentWithInventoryForMutation,
  lockInventoryForAdjustment,
  recomputeAndPersistNetDeducted,
  updatePendingAdjustmentRow,
  withDatabaseTransaction,
  type UpdatePendingAdjustmentRowPatch,
} from "@builders/db"
import {
  assertAdjustmentExpectedUpdatedAtMatches,
  assertAdjustmentLinkMutationAllowed,
  assertAdjustmentLinkageRules,
  assertAdjustmentPendingMutationAllowed,
  assertNetDeductedWithinStartingStock,
  deriveAdjustmentCoverageString,
  describeAdjustmentPendingFormIssues,
  InventoryAdjustmentDomainError,
  validateAdjustmentPendingForm,
} from "@builders/domain"
import { InventoryAdjustmentExecutionError } from "./errors.js"
import { assertAdjustmentScope } from "./scope.js"
import type {
  AdjustmentMutationResult,
  UpdatePendingAdjustmentInput,
} from "./types.js"

export async function updatePendingAdjustmentUseCase(
  input: UpdatePendingAdjustmentInput,
  client?: Prisma.TransactionClient,
): Promise<AdjustmentMutationResult> {
  let resolvedWomiTarget: {
    workOrderId: string
    workOrderItemId: string
    productId: string
  } | null = null
  if (input.patch.link !== undefined && input.patch.link.workOrderId !== null) {
    const womi = await db.flooringWorkOrderItem.findUnique({
      where: { id: input.patch.link.workOrderItemId! },
      select: {
        id: true,
        workOrderId: true,
        productId: true,
      },
    })
    if (!womi) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
        message: "Re-link target work-order material item not found",
        status: 404,
        payload: { workOrderItemId: input.patch.link.workOrderItemId },
      })
    }
    if (womi.workOrderId !== input.patch.link.workOrderId) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_SCOPE_MISMATCH",
        message:
          "Re-link target material item does not belong to the provided work order",
        status: 400,
        payload: {
          providedWorkOrderId: input.patch.link.workOrderId,
          actualWorkOrderId: womi.workOrderId,
        },
      })
    }
    // The target work order's warehouse is intentionally NOT checked: an
    // adjustment's warehouse follows its inventory, not the linked WO, so a
    // WO with no warehouse (or a different one) is a valid relink target.
    resolvedWomiTarget = {
      workOrderId: womi.workOrderId,
      workOrderItemId: womi.id,
      productId: womi.productId,
    }
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const found = await getPendingAdjustmentWithInventoryForMutation(c, input.adjustmentId)
    if (!found) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
        message: "Inventory adjustment not found",
        status: 404,
      })
    }
    const { adjustment: existing, inventory } = found

    assertAdjustmentScope(input.scope, {
      workOrderId: existing.workOrderId,
      inventoryId: existing.inventoryId,
    })

    const hasLinkPatch = input.patch.link !== undefined
    const hasFieldPatch =
      input.patch.quantity !== undefined ||
      input.patch.isWaste !== undefined ||
      input.patch.notes !== undefined
    if (hasFieldPatch) {
      try {
        assertAdjustmentPendingMutationAllowed({
          status: existing.status,
          isFinal: existing.isFinal,
        })
      } catch (error) {
        if (error instanceof InventoryAdjustmentDomainError) {
          throw new InventoryAdjustmentExecutionError({
            code: "INVENTORY_ADJUSTMENT_NOT_PENDING",
            message:
              "Inventory adjustment cannot be edited; it has been finalized",
            status: 409,
            payload: {
              adjustmentId: existing.id,
              status: existing.status,
              isFinal: existing.isFinal,
            },
          })
        }
        throw error
      }
    }
    if (hasLinkPatch) {
      try {
        assertAdjustmentLinkMutationAllowed({
          status: existing.status,
          adjustmentType: existing.adjustmentType,
        })
      } catch (error) {
        if (error instanceof InventoryAdjustmentDomainError) {
          throw new InventoryAdjustmentExecutionError({
            code: "INVENTORY_ADJUSTMENT_LINK_NOT_ALLOWED",
            message: "Adjustment link cannot be changed in its current state.",
            status: 409,
            payload: {
              adjustmentId: existing.id,
              status: existing.status,
            },
          })
        }
        throw error
      }
      // Structural sanity-check on the patch shape itself (both-null OR
      // both-set for a DEDUCTION row).
      assertAdjustmentLinkageRules({
        adjustmentType: existing.adjustmentType,
        workOrderId: input.patch.link!.workOrderId,
        workOrderItemId: input.patch.link!.workOrderItemId,
        isWaste: input.patch.isWaste ?? existing.isWaste,
      })
    }

    try {
      assertAdjustmentExpectedUpdatedAtMatches({
        rowUpdatedAt: existing.updatedAt,
        expected: input.expectedUpdatedAt,
      })
    } catch (error) {
      if (error instanceof InventoryAdjustmentDomainError) {
        throw new InventoryAdjustmentExecutionError({
          code: "INVENTORY_ADJUSTMENT_STALE",
          message:
            "Inventory adjustment was modified by someone else; refresh and try again",
          status: 409,
          payload: {
            adjustmentId: existing.id,
            expected: input.expectedUpdatedAt,
            actual: existing.updatedAt,
          },
        })
      }
      throw error
    }

    if (resolvedWomiTarget !== null) {
      // Warehouse is intentionally NOT compared here — see the relink-target
      // resolution above. Only the product must still match: an adjustment
      // references inventory of a fixed product, so its WO link must point at
      // a material item for that same product.
      if (resolvedWomiTarget.productId !== existing.productId) {
        throw new InventoryAdjustmentExecutionError({
          code: "INVENTORY_ADJUSTMENT_LINK_SCOPE_MISMATCH",
          message:
            "Re-link target material item is for a different product than the adjustment",
          status: 400,
          payload: {
            adjustmentProductId: existing.productId,
            targetProductId: resolvedWomiTarget.productId,
          },
        })
      }
    }

    const mergedQuantity =
      input.patch.quantity !== undefined ? input.patch.quantity : existing.quantity
    const mergedIsWaste =
      input.patch.isWaste !== undefined ? input.patch.isWaste : existing.isWaste
    const mergedNotes =
      input.patch.notes !== undefined ? input.patch.notes : existing.notes
    const formIssues = validateAdjustmentPendingForm({
      adjustmentType: existing.adjustmentType,
      quantity: mergedQuantity,
      isWaste: mergedIsWaste,
      notes: mergedNotes,
    })
    if (formIssues.length > 0) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_VALIDATION_FAILED",
        message: describeAdjustmentPendingFormIssues(formIssues),
        status: 400,
        payload: { issues: formIssues },
      })
    }

    await lockInventoryForAdjustment(c, existing.inventoryId)

    const patch: UpdatePendingAdjustmentRowPatch = {}
    if (input.patch.quantity !== undefined) {
      patch.quantity = input.patch.quantity
      patch.coverage = deriveAdjustmentCoverageString({
        quantity: input.patch.quantity,
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

    const adjustment = await updatePendingAdjustmentRow(c, { id: existing.id, patch })

    const recomputed = await recomputeAndPersistNetDeducted(c, [existing.inventoryId])
    const result = recomputed[0]
    if (!result) {
      throw new InventoryAdjustmentDomainError(
        "INVENTORY_ADJUSTMENT_NET_DEDUCTED_EXCEEDS_STARTING_STOCK",
        {
          reason: "recompute returned no rows",
          inventoryId: existing.inventoryId,
        },
      )
    }
    try {
      assertNetDeductedWithinStartingStock({
        netDeducted: result.netDeducted,
        startingStock: inventory.startingStock,
      })
    } catch (error) {
      if (
        error instanceof InventoryAdjustmentDomainError &&
        error.code === "INVENTORY_ADJUSTMENT_NET_DEDUCTED_EXCEEDS_STARTING_STOCK"
      ) {
        const unit = inventory.stockUnitAbbrev ? ` ${inventory.stockUnitAbbrev}` : ""
        throw new InventoryAdjustmentExecutionError({
          code: "INVENTORY_ADJUSTMENT_EXCEEDS_INVENTORY",
          message: `Adjustment exceeds available inventory: net deducted would be ${result.netDeducted}${unit} but only ${inventory.startingStock}${unit} is available.`,
          status: 400,
          payload: {
            inventoryId: result.inventoryId,
            netDeducted: result.netDeducted,
            startingStock: inventory.startingStock,
          },
        })
      }
      throw error
    }

    return {
      adjustment,
      inventoryId: result.inventoryId,
      netDeducted: result.netDeducted,
    }
  })
}
