import { InventoryAdjustmentDomainError } from "../errors.js"
import type { FlooringInventoryAdjustmentType } from "../types.js"

const ARITHMETIC_TOLERANCE = 0.005

export function assertBeforeAfterInvariant(input: {
  before: string
  signedDelta: string | number
  after: string
}): void {
  const before = Number(input.before)
  const signedDelta = Number(input.signedDelta)
  const after = Number(input.after)
  if (!Number.isFinite(before) || !Number.isFinite(signedDelta) || !Number.isFinite(after)) {
    throw new InventoryAdjustmentDomainError("INVENTORY_ADJUSTMENT_ARITHMETIC_MISMATCH", {
      before: input.before,
      signedDelta: input.signedDelta,
      after: input.after,
    })
  }
  if (Math.abs(before - signedDelta - after) > ARITHMETIC_TOLERANCE) {
    throw new InventoryAdjustmentDomainError("INVENTORY_ADJUSTMENT_ARITHMETIC_MISMATCH", {
      before,
      signedDelta,
      after,
      expectedAfter: before - signedDelta,
    })
  }
}

/**
 * Linkage + structural rules for an adjustment row. Applies to BOTH directions:
 * workOrderId / workOrderItemId are either both null or both set. An INCREASE
 * may now carry a work-order link (return-to-stock against a WO is supported);
 * direction no longer constrains linkage. `isWaste` is a reporting flag
 * orthogonal to direction and is allowed on either type.
 */
export function assertAdjustmentLinkageRules(input: {
  adjustmentType: FlooringInventoryAdjustmentType
  workOrderId: string | null
  workOrderItemId: string | null
  isWaste?: boolean
}): void {
  const orderSet = input.workOrderId !== null && input.workOrderId !== ""
  const itemSet = input.workOrderItemId !== null && input.workOrderItemId !== ""

  if (orderSet !== itemSet) {
    throw new InventoryAdjustmentDomainError("INVENTORY_ADJUSTMENT_LINKAGE_ASYMMETRY", {
      workOrderId: input.workOrderId,
      workOrderItemId: input.workOrderItemId,
    })
  }
}

/**
 * Invariant: an adjustment's warehouse is always its parent inventory's
 * warehouse — the two can never differ. The persisted `adjustment.warehouseId`
 * is derived from the inventory at create time; this guard asserts that
 * derivation held. The warehouse picker in the form is only a filter; the
 * source of truth is the chosen inventory.
 */
export function assertAdjustmentWarehouseMatchesInventory(input: {
  adjustmentWarehouseId: string
  inventoryWarehouseId: string
}): void {
  if (input.adjustmentWarehouseId !== input.inventoryWarehouseId) {
    throw new InventoryAdjustmentDomainError("INVENTORY_ADJUSTMENT_WAREHOUSE_INVENTORY_MISMATCH", {
      adjustmentWarehouseId: input.adjustmentWarehouseId,
      inventoryWarehouseId: input.inventoryWarehouseId,
    })
  }
}
