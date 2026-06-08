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
  assertAdjustmentWarehouseMatchesInventory,
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
 * Create a pending inventory adjustment. INCREASE or DEDUCTION; may optionally
 * carry a WO link (both link columns set or both null — an INCREASE may link a
 * work order). When a link is present the WOMI is validated against the work
 * order. Locks the parent inventory row, recomputes `netDeducted`, and asserts
 * the ceiling invariant after the insert.
 */
export async function createPendingAdjustmentUseCase(
  input: CreatePendingAdjustmentInput,
  client?: Prisma.TransactionClient,
): Promise<AdjustmentMutationResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const quantity = input.quantity
    const notes = input.notes
    const adjustmentType: FlooringInventoryAdjustmentType = input.adjustmentType
    // A WO link is optional and both-or-neither (the linkage symmetry rule
    // below enforces it). An INCREASE may link a work order.
    const workOrderId = input.workOrderId ?? null
    const workOrderItemId = input.workOrderItemId ?? null
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

    // Validate the WOMI scope whenever a link is present (always for `cut`,
    // optionally for a WO-linked `manual` create).
    if (workOrderItemId !== null && workOrderId !== null) {
      const womi = await c.flooringWorkOrderItem.findUnique({
        where: { id: workOrderItemId },
        select: { id: true, workOrderId: true },
      })
      if (!womi) {
        throw new InventoryAdjustmentExecutionError({
          code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
          message: "Work order material item not found",
          status: 404,
        })
      }
      if (womi.workOrderId !== workOrderId) {
        throw new InventoryAdjustmentExecutionError({
          code: "INVENTORY_ADJUSTMENT_SCOPE_MISMATCH",
          message: "Material item does not belong to this work order",
          status: 400,
          payload: {
            providedWorkOrderId: workOrderId,
            actualWorkOrderId: womi.workOrderId,
          },
        })
      }
    }

    // Linkage symmetry: both link columns set or both null (either direction).
    assertAdjustmentLinkageRules({
      adjustmentType,
      workOrderId,
      workOrderItemId,
      isWaste,
    })

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

    // Invariant: the persisted warehouse is always the inventory's. When the
    // form passed its selected warehouse filter, assert it matches the chosen
    // inventory's warehouse (guards a client that picked mismatched options).
    if (input.warehouseId != null && input.warehouseId !== "") {
      try {
        assertAdjustmentWarehouseMatchesInventory({
          adjustmentWarehouseId: input.warehouseId,
          inventoryWarehouseId: inventory.warehouseId,
        })
      } catch (error) {
        if (
          error instanceof InventoryAdjustmentDomainError &&
          error.code === "INVENTORY_ADJUSTMENT_WAREHOUSE_INVENTORY_MISMATCH"
        ) {
          throw new InventoryAdjustmentExecutionError({
            code: "INVENTORY_ADJUSTMENT_WAREHOUSE_INVENTORY_MISMATCH",
            message: "Selected warehouse does not match the chosen inventory's warehouse.",
            status: 400,
            payload: error.detail,
          })
        }
        throw error
      }
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
        warehouseId: inventory.warehouseId,
      }),
      // User-owned free text — never seeded from the parent inventory.
      location: input.location ?? null,
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
