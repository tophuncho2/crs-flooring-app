import { InventoryAdjustmentDomainError } from "../errors.js"

/**
 * Optimistic-concurrency guard: the row's `updatedAt` must match the value the
 * client last read. Orthogonal to editability — every adjustment is now freely
 * editable (there is no finalize/freeze), but a stale write is still rejected.
 */
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
