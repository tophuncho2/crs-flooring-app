import {
  Prisma,
  getInventoryParentContextForAdjustments,
  insertPendingAdjustmentRow,
  lockInventoryForAdjustment,
  recomputeAndPersistNetDeducted,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertAdjustmentLinkageRules,
  assertNetDeductedWithinStartingStock,
  buildPendingAdjustmentInventorySnapshot,
  deriveAdjustmentCoverageString,
  describeAdjustmentPendingFormIssues,
  InventoryAdjustmentDomainError,
  validateAdjustmentPendingForm,
  type FlooringInventoryAdjustmentType,
} from "@builders/domain"
import { InventoryAdjustmentExecutionError } from "./errors.js"
import type {
  AdjustmentMutationResult,
  CreatePendingAdjustmentInput,
} from "./types.js"

/**
 * Create a pending inventory adjustment.
 *
 *  - `variant: "cut"` — WO-linked DEDUCTION. Validates the WOMI exists +
 *    belongs to the provided work order, then writes a DEDUCTION row with
 *    both link columns set (and `isWaste` honored).
 *  - `variant: "manual"` — free-form adjustment. INCREASE or DEDUCTION
 *    direction; never WO-linked; `isWaste` honored on either direction.
 *
 * Either variant locks the parent inventory row, recomputes `netDeducted`,
 * and asserts the ceiling invariant after the insert.
 */
export async function createPendingAdjustmentUseCase(
  input: CreatePendingAdjustmentInput,
  client?: Prisma.TransactionClient,
): Promise<AdjustmentMutationResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const quantity = input.quantity
    const notes = input.notes
    const adjustmentType: FlooringInventoryAdjustmentType =
      input.variant === "cut" ? "DEDUCTION" : input.adjustmentType
    const workOrderId = input.variant === "cut" ? input.workOrderId : null
    const workOrderItemId = input.variant === "cut" ? input.workOrderItemId : null
    const isWaste = input.isWaste

    const formIssues = validateAdjustmentPendingForm({
      adjustmentType,
      quantity,
      isWaste,
      notes,
    })
    if (formIssues.length > 0) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_VALIDATION_FAILED",
        message: describeAdjustmentPendingFormIssues(formIssues),
        status: 400,
        payload: { issues: formIssues },
      })
    }

    if (input.variant === "cut") {
      const womi = await c.flooringWorkOrderItem.findUnique({
        where: { id: input.workOrderItemId },
        select: { id: true, workOrderId: true },
      })
      if (!womi) {
        throw new InventoryAdjustmentExecutionError({
          code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
          message: "Work order material item not found",
          status: 404,
        })
      }
      if (womi.workOrderId !== input.workOrderId) {
        throw new InventoryAdjustmentExecutionError({
          code: "INVENTORY_ADJUSTMENT_SCOPE_MISMATCH",
          message: "Material item does not belong to this work order",
          status: 400,
          payload: {
            providedWorkOrderId: input.workOrderId,
            actualWorkOrderId: womi.workOrderId,
          },
        })
      }
    }

    try {
      assertAdjustmentLinkageRules({
        adjustmentType,
        workOrderId,
        workOrderItemId,
        isWaste,
      })
    } catch (error) {
      if (error instanceof InventoryAdjustmentDomainError) {
        if (error.code === "INVENTORY_ADJUSTMENT_INCREASE_REQUIRES_NO_WORK_ORDER") {
          throw new InventoryAdjustmentExecutionError({
            code: "INVENTORY_ADJUSTMENT_INCREASE_REQUIRES_NO_WORK_ORDER",
            message: "An INCREASE adjustment cannot be linked to a work order.",
            status: 400,
            payload: error.detail,
          })
        }
      }
      throw error
    }

    await lockInventoryForAdjustment(c, input.inventoryId)

    const inventory = await getInventoryParentContextForAdjustments(c, input.inventoryId)
    if (!inventory) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
        message: "Parent inventory not found",
        status: 404,
        payload: { inventoryId: input.inventoryId },
      })
    }

    const coverage = deriveAdjustmentCoverageString({
      quantity,
      coveragePerUnit: inventory.coveragePerUnit,
      categorySlug: inventory.categorySlug,
    })

    const adjustment = await insertPendingAdjustmentRow(c, {
      adjustmentType,
      workOrderId,
      workOrderItemId,
      inventoryId: input.inventoryId,
      quantity,
      coverage,
      isWaste,
      notes,
      unitSnapshot: {
        stockUnitName: inventory.stockUnitName,
        stockUnitAbbrev: inventory.stockUnitAbbrev,
        itemCoverageUnitName: inventory.itemCoverageUnitName,
        itemCoverageUnitAbbrev: inventory.itemCoverageUnitAbbrev,
      },
      inventorySnapshot: buildPendingAdjustmentInventorySnapshot({
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

    const recomputed = await recomputeAndPersistNetDeducted(c, [input.inventoryId])
    const result = recomputed[0]
    if (!result) {
      throw new InventoryAdjustmentDomainError(
        "INVENTORY_ADJUSTMENT_NET_DEDUCTED_EXCEEDS_STARTING_STOCK",
        {
          reason: "recompute returned no rows",
          inventoryId: input.inventoryId,
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
