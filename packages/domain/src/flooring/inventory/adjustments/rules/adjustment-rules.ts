import { canDeleteAdjustment } from "../editability.js"
import { InventoryAdjustmentDomainError } from "../errors.js"
import type {
  FlooringInventoryAdjustmentStatus,
  FlooringInventoryAdjustmentType,
  InventoryAdjustmentRow,
} from "../types.js"

const ARITHMETIC_TOLERANCE = 0.005

export function formatAdjustmentStatus(
  status: FlooringInventoryAdjustmentStatus,
): "Pending" | "Queued" | "Final" {
  if (status === "QUEUED") return "Queued"
  if (status === "FINAL") return "Final"
  return "Pending"
}

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

export function assertAdjustmentDeleteAllowed(
  row: Pick<InventoryAdjustmentRow, "status" | "isFinal">,
): void {
  if (!canDeleteAdjustment(row)) {
    throw new InventoryAdjustmentDomainError("INVENTORY_ADJUSTMENT_PENDING_INPUT_NOT_ALLOWED", {
      status: row.status,
      isFinal: row.isFinal,
    })
  }
}

/**
 * Linkage + structural rules for an adjustment row.
 *  - DEDUCTION: workOrderId / workOrderItemId either both null or both set.
 *  - INCREASE:  both must be null. (Return-to-stock — INCREASE with a WO link
 *               — is intentionally not supported in this pass.) `isWaste` is a
 *               reporting flag orthogonal to direction and is allowed on either
 *               type.
 */
export function assertAdjustmentLinkageRules(input: {
  adjustmentType: FlooringInventoryAdjustmentType
  workOrderId: string | null
  workOrderItemId: string | null
  isWaste?: boolean
}): void {
  const orderSet = input.workOrderId !== null && input.workOrderId !== ""
  const itemSet = input.workOrderItemId !== null && input.workOrderItemId !== ""

  if (input.adjustmentType === "INCREASE") {
    if (orderSet || itemSet) {
      throw new InventoryAdjustmentDomainError(
        "INVENTORY_ADJUSTMENT_INCREASE_REQUIRES_NO_WORK_ORDER",
        { workOrderId: input.workOrderId, workOrderItemId: input.workOrderItemId },
      )
    }
    return
  }

  if (orderSet !== itemSet) {
    throw new InventoryAdjustmentDomainError("INVENTORY_ADJUSTMENT_LINKAGE_ASYMMETRY", {
      workOrderId: input.workOrderId,
      workOrderItemId: input.workOrderItemId,
    })
  }
}
