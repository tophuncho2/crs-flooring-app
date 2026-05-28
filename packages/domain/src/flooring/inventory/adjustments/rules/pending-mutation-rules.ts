import { canRelinkAdjustment } from "../editability.js"
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
  if (row.adjustmentType === "INCREASE") {
    throw new InventoryAdjustmentDomainError(
      "INVENTORY_ADJUSTMENT_INCREASE_REQUIRES_NO_WORK_ORDER",
      { status: row.status, adjustmentType: row.adjustmentType },
    )
  }
  if (!canRelinkAdjustment(row)) {
    throw new InventoryAdjustmentDomainError("INVENTORY_ADJUSTMENT_LINK_NOT_ALLOWED", {
      status: row.status,
      adjustmentType: row.adjustmentType,
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
