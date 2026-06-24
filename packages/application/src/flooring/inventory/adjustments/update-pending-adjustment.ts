import {
  Prisma,
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

    // Every field — quantity, the metadata trio, and the WO link — is freely
    // editable for the whole lifecycle of the row; there is no finalize/freeze
    // and `QUEUED` never occurs. The WO link is a plain `workOrderId` (any
    // product, any direction), so no linkage/product invariant applies.
    const mergedAdjustmentType =
      input.patch.adjustmentType !== undefined
        ? input.patch.adjustmentType
        : existing.adjustmentType

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
    // Non-semantic palette tag — metadata only, leaves the ledger chain untouched.
    if (input.patch.color !== undefined) patch.color = input.patch.color
    // Location is user-owned free text — written only when the patch carries it,
    // never re-snapped from the parent inventory.
    if (input.patch.location !== undefined) patch.location = input.patch.location
    if (input.patch.link !== undefined) {
      patch.workOrderId = input.patch.link.workOrderId
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
