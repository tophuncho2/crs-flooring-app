import { InventoryAdjustmentDomainError } from "../errors.js"
import type { FlooringInventoryAdjustmentType } from "../types.js"

export type SignedDeltaRowInput = {
  quantity: string | number | null
  adjustmentType: FlooringInventoryAdjustmentType
}

/**
 * Signed contribution of one adjustment row to `netDeducted`:
 *   DEDUCTION → +quantity   (removes from inventory)
 *   INCREASE  → −quantity   (adds back to inventory)
 *
 * Non-finite / null quantities contribute 0; downstream invariants catch
 * bad rows separately.
 */
export function signedDelta(row: SignedDeltaRowInput): number {
  if (row.quantity === null) return 0
  const value = Number(row.quantity)
  if (!Number.isFinite(value)) return 0
  return row.adjustmentType === "INCREASE" ? -value : value
}

export function computeNetDeducted(rows: ReadonlyArray<SignedDeltaRowInput>): string {
  let total = 0
  for (const row of rows) {
    total += signedDelta(row)
  }
  return total.toFixed(2)
}

export function assertNetDeductedWithinStartingStock(input: {
  netDeducted: string | number
  startingStock: string | number
}): void {
  const net = Number(input.netDeducted)
  const stock = Number(input.startingStock)
  if (!Number.isFinite(net) || !Number.isFinite(stock)) {
    throw new InventoryAdjustmentDomainError(
      "INVENTORY_ADJUSTMENT_NET_DEDUCTED_EXCEEDS_STARTING_STOCK",
      {
        netDeducted: input.netDeducted,
        startingStock: input.startingStock,
        reason: "non-finite-input",
      },
    )
  }
  if (net > stock) {
    throw new InventoryAdjustmentDomainError(
      "INVENTORY_ADJUSTMENT_NET_DEDUCTED_EXCEEDS_STARTING_STOCK",
      { netDeducted: net, startingStock: stock, overage: net - stock },
    )
  }
}

export function isNetDeductedWithinStartingStock(input: {
  netDeducted: string | number
  startingStock: string | number
}): boolean {
  const net = Number(input.netDeducted)
  const stock = Number(input.startingStock)
  if (!Number.isFinite(net) || !Number.isFinite(stock)) return false
  return net <= stock
}
