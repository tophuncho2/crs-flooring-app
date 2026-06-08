import { canEditAdjustmentMeta, canRelinkAdjustment } from "../editability.js"
import { assertAdjustmentDeleteAllowed } from "./adjustment-rules.js"
import { InventoryAdjustmentDomainError } from "../errors.js"
import type { InventoryAdjustmentRow } from "../types.js"

export function assertAdjustmentPendingMutationAllowed(
  row: Pick<InventoryAdjustmentRow, "status" | "isFinal">,
): void {
  assertAdjustmentDeleteAllowed(row)
}

export function assertAdjustmentLinkMutationAllowed(
  row: Pick<InventoryAdjustmentRow, "status" | "adjustmentType">,
): void {
  if (!canRelinkAdjustment(row)) {
    throw new InventoryAdjustmentDomainError("INVENTORY_ADJUSTMENT_LINK_NOT_ALLOWED", {
      status: row.status,
      adjustmentType: row.adjustmentType,
    })
  }
}

/**
 * Gates the metadata trio (`location`, `notes`, `isWaste`). Like the link gate,
 * it permits PENDING and FINAL and rejects only QUEUED — these fields stay
 * editable after finalize. `quantity` is gated separately by
 * `assertAdjustmentPendingMutationAllowed` (pending-only).
 */
export function assertAdjustmentMetaMutationAllowed(
  row: Pick<InventoryAdjustmentRow, "status">,
): void {
  if (!canEditAdjustmentMeta(row)) {
    throw new InventoryAdjustmentDomainError("INVENTORY_ADJUSTMENT_META_NOT_ALLOWED", {
      status: row.status,
    })
  }
}

export function assertAdjustmentExpectedUpdatedAtMatches(input: {
  rowUpdatedAt: string
  expected: string
}): void {
  if (input.rowUpdatedAt !== input.expected) {
    throw new InventoryAdjustmentDomainError("INVENTORY_ADJUSTMENT_STALE_UPDATED_AT", {
      expected: input.expected,
      actual: input.rowUpdatedAt,
    })
  }
}
