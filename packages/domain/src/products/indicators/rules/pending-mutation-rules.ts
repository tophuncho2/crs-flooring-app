import { InventoryIndicatorDomainError } from "../errors.js"

/**
 * Optimistic-concurrency guard: the row's `updatedAt` must match the value the
 * client last read, else a concurrent edit is rejected.
 */
export function assertIndicatorExpectedUpdatedAtMatches(input: {
  rowUpdatedAt: string
  expected: string
}): void {
  if (input.rowUpdatedAt !== input.expected) {
    throw new InventoryIndicatorDomainError("INVENTORY_INDICATOR_STALE_UPDATED_AT", {
      expected: input.expected,
      actual: input.rowUpdatedAt,
    })
  }
}
