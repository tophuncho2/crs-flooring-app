import { InventoryAdjustmentDomainError } from "../errors.js"

/**
 * Computes the `before` / `after` stamp pair for an adjustment about to be
 * finalized. Inputs are signed: `priorNetDeducted` is the running sum of
 * `signedDelta(row)` across already-finalized rows for this inventory
 * (DEDUCTIONs positive, INCREASEs negative); `signedDelta` is the signed
 * contribution of the row being finalized.
 *
 *   before = startingStock − priorNetDeducted
 *   after  = before − signedDelta
 *
 * For a DEDUCTION (positive signedDelta), `after < before` — material leaves.
 * For an INCREASE (negative signedDelta), `after > before` — material returns.
 */
export function computeBeforeAfterForFinalize(input: {
  startingStock: string | number
  priorNetDeducted: string | number
  signedDelta: string | number
}): { before: string; after: string } {
  const startingStock = Number(input.startingStock)
  const priorNetDeducted = Number(input.priorNetDeducted)
  const signedDelta = Number(input.signedDelta)
  if (
    !Number.isFinite(startingStock) ||
    !Number.isFinite(priorNetDeducted) ||
    !Number.isFinite(signedDelta)
  ) {
    throw new InventoryAdjustmentDomainError("INVENTORY_ADJUSTMENT_ARITHMETIC_MISMATCH", {
      startingStock: input.startingStock,
      priorNetDeducted: input.priorNetDeducted,
      signedDelta: input.signedDelta,
      reason: "non-finite-input",
    })
  }
  const before = startingStock - priorNetDeducted
  const after = before - signedDelta
  return { before: before.toFixed(2), after: after.toFixed(2) }
}
