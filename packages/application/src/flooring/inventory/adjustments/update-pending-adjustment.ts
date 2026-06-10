import {
  Prisma,
  db,
  getAdjustmentById,
  getPendingAdjustmentWithInventoryForMutation,
  lockInventoryForAdjustment,
  recomputeAndPersistNetDeducted,
  updatePendingAdjustmentRow,
  withDatabaseTransaction,
  type UpdatePendingAdjustmentRowPatch,
} from "@builders/db"
import {
  assertAdjustmentExpectedUpdatedAtMatches,
  assertAdjustmentLinkageRules,
  assertNetDeductedWithinStartingStock,
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

    // Every field — quantity, the metadata trio, and the WO link — is now
    // freely editable for the whole lifecycle of the row; there is no
    // finalize/freeze and `QUEUED` never occurs. Only the structural linkage
    // symmetry (both ids set, or both null) is still enforced on a link patch.
    const mergedAdjustmentType =
      input.patch.adjustmentType !== undefined
        ? input.patch.adjustmentType
        : existing.adjustmentType
    if (input.patch.link !== undefined || input.patch.adjustmentType !== undefined) {
      assertAdjustmentLinkageRules({
        adjustmentType: mergedAdjustmentType,
        workOrderId:
          input.patch.link !== undefined
            ? input.patch.link.workOrderId
            : existing.workOrderId,
        workOrderItemId:
          input.patch.link !== undefined
            ? input.patch.link.workOrderItemId
            : existing.workOrderItemId,
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
      adjustmentType: mergedAdjustmentType,
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
    }
    if (input.patch.adjustmentType !== undefined) {
      patch.adjustmentType = input.patch.adjustmentType
    }
    if (input.patch.isWaste !== undefined) patch.isWaste = input.patch.isWaste
    if (input.patch.notes !== undefined) patch.notes = input.patch.notes
    // Location is user-owned free text — written only when the patch carries it,
    // never re-snapped from the parent inventory.
    if (input.patch.location !== undefined) patch.location = input.patch.location
    if (input.patch.link !== undefined) {
      patch.workOrderId = input.patch.link.workOrderId
      patch.workOrderItemId = input.patch.link.workOrderItemId
    }

    const written = await updatePendingAdjustmentRow(c, { id: existing.id, patch })

    // Only quantity + direction move the running balance. A metadata-only edit
    // (notes / isWaste / location / link) leaves the whole before/after chain
    // and netDeducted untouched, so skip the ledger replay + ceiling re-check
    // and return the written row with the inventory's existing netDeducted.
    const chainTouched =
      input.patch.quantity !== undefined || input.patch.adjustmentType !== undefined
    if (!chainTouched) {
      return {
        adjustment: written,
        inventoryId: existing.inventoryId,
        netDeducted: inventory.currentNetDeducted,
      }
    }

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

    // The recompute rewrote this row's `before`/`after` (and the rest of the
    // chain); re-read so the response carries the fresh ledger values.
    const adjustment = (await getAdjustmentById(existing.id, c)) ?? written

    return {
      adjustment,
      inventoryId: result.inventoryId,
      netDeducted: result.netDeducted,
    }
  })
}
