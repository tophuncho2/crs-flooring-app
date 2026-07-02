import {
  Prisma,
  getAdjustmentById,
  getInventoryParentContextForAdjustments,
  insertPendingAdjustmentRow,
  lockInventoryForAdjustment,
  recomputeAndPersistNetDeducted,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertAdjustmentWarehouseMatchesInventory,
  assertNetDeductedWithinStartingStock,
  buildPendingAdjustmentInventorySnapshot,
  computeAdjustmentMoneyShare,
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
 * carry a `workOrderId` link (any product, any direction — adjustments never
 * link to a material item). Locks the parent inventory row, recomputes
 * `netDeducted`, and asserts the ceiling invariant after the insert.
 */
export async function createPendingAdjustmentUseCase(
  input: CreatePendingAdjustmentInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<AdjustmentMutationResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("createPendingAdjustmentUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const quantity = input.quantity
    const internalNotes = input.internalNotes
    const adjustmentType: FlooringInventoryAdjustmentType = input.adjustmentType
    // An optional work-order link (any product, any direction). The work order
    // is not validated against the inventory's product — adjustments fulfil a
    // work order regardless of which products it requested.
    const workOrderId = input.workOrderId ?? null
    const isWaste = input.isWaste

    const formIssues = validateAdjustmentPendingForm({
      adjustmentType,
      quantity,
      isWaste,
      internalNotes,
    })
    if (formIssues.length > 0) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_VALIDATION_FAILED",
        message: describeAdjustmentPendingFormIssues(formIssues),
        status: 400,
        payload: { issues: formIssues },
      })
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

    // Derive the unsigned cost/freight share of the parent inventory's money
    // figures attributable to this adjustment's quantity. Null when the parent
    // carries no cost/freight. The +/− sign is derived from `adjustmentType` at
    // display, never stored.
    const cost = computeAdjustmentMoneyShare(inventory.cost, inventory.startingStock, quantity)
    const freight = computeAdjustmentMoneyShare(inventory.freight, inventory.startingStock, quantity)

    const inserted = await insertPendingAdjustmentRow(c, {
      adjustmentType,
      workOrderId,
      inventoryId: input.inventoryId,
      quantity,
      isWaste,
      internalNotes,
      color: input.color,
      cost,
      freight,
      // Stamp the parent inventory's unit FK onto the ledger row (UoM epic 2B).
      unitSnapshot: {
        unitId: inventory.unitId,
      },
      inventorySnapshot: buildPendingAdjustmentInventorySnapshot({
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
      area: input.area ?? null,
      createdBy: actorEmail,
      updatedBy: actorEmail,
    })

    // The subsequent recompute rewrites before/after on the whole chain but
    // never touches actor columns — see the load-bearing comment in
    // recomputeAndPersistNetDeducted.
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

    // The recompute stamped this row's `before`/`after` (insert left them null);
    // re-read so the response carries the fresh ledger values.
    const adjustment = (await getAdjustmentById(inserted.id, c)) ?? inserted

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
