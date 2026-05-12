import { CutLogDomainError } from "./errors.js"

/**
 * Pure helper for the finalize worker's per-row `before` / `after` math.
 *
 * The finalize worker processes a batch of pending cut logs in deterministic
 * order (sweep 3 data layer sorts by `createdAt ASC, id ASC` before iterating).
 * For each row in that order, the worker tracks a running `priorConsumed`
 * total — the sum of every cut value that's already been applied to the
 * inventory's running balance "before" this row, including:
 *   - all already-finalized non-void cuts (the baseline)
 *   - all earlier-in-this-batch cuts (folded in during the loop)
 *
 * `before` = `startingStock - priorConsumed`
 * `after`  = `before - cut`
 *
 * Returns both as two-decimal strings, matching the schema's `Decimal(12, 2)`.
 *
 * Note this helper does NOT enforce the `totalCutSum ≤ startingStock`
 * invariant — that's `assertCutSumWithinStartingStock`'s job, called by the
 * application use case. This helper is pure subtraction with no business
 * rule, just an input-validation throw on non-finite values.
 */
export function computeBeforeAfterForFinalize(input: {
  startingStock: string | number
  priorConsumed: string | number
  cut: string | number
}): { before: string; after: string } {
  const startingStock = Number(input.startingStock)
  const priorConsumed = Number(input.priorConsumed)
  const cut = Number(input.cut)
  if (
    !Number.isFinite(startingStock) ||
    !Number.isFinite(priorConsumed) ||
    !Number.isFinite(cut)
  ) {
    throw new CutLogDomainError("CUT_LOG_ARITHMETIC_MISMATCH", {
      startingStock: input.startingStock,
      priorConsumed: input.priorConsumed,
      cut: input.cut,
      reason: "non-finite-input",
    })
  }
  const before = startingStock - priorConsumed
  const after = before - cut
  return { before: before.toFixed(2), after: after.toFixed(2) }
}
