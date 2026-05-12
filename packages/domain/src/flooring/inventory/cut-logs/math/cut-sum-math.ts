import { CutLogDomainError } from "../errors.js"

/**
 * Pure helpers for the `inventory.totalCutSum` invariant. Single source of
 * truth for "sum the non-void cuts" and "the sum cannot exceed starting
 * stock." Used by:
 *  - The pending-save worker (after applying the diff, asserts the new
 *    projected sum is within bounds before commit).
 *  - The void worker (after erasing a cut, recomputes and asserts).
 *  - The diff validator in `diff/rules.ts` (projects the post-diff sum and
 *    surfaces a diff-validation issue if it would exceed starting stock,
 *    instead of throwing).
 *
 * Decimal handling: the cut column is a `Decimal(12, 2)` in Postgres,
 * surfaced as a string at the data-layer boundary. We accept string |
 * number | null inputs, coerce via `Number`, and skip non-finite values.
 * That tracks `assertBeforeCutAfterInvariant`'s precedent in
 * `cut-log-rules.ts` and keeps the domain free of any decimal library.
 *
 * Note on precision: Number coercion is fine for two-decimal stock units up
 * to ~1e10 — we're nowhere near floating-point precision limits for typical
 * flooring quantities. If precision-critical math ever lands here, swap in
 * a decimal library at the same time across the rest of the domain.
 */

export type CutSumRowInput = {
  cut: string | number | null
  void: boolean
}

/**
 * Sum the `cut` values from non-void rows. Returns the total as a string
 * formatted to two decimal places, matching the `Decimal(12, 2)` schema.
 *
 * Pure: no I/O. Caller hands the projected row state (post-diff or
 * post-void) and gets a deterministic total back.
 */
export function computeTotalCutSum(rows: ReadonlyArray<CutSumRowInput>): string {
  let total = 0
  for (const row of rows) {
    if (row.void) continue
    if (row.cut === null) continue
    const value = Number(row.cut)
    if (!Number.isFinite(value)) continue
    total += value
  }
  return total.toFixed(2)
}

/**
 * Asserts the invariant `totalCutSum ≤ startingStock`. Throws
 * `CutLogDomainError("CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK")` with
 * detail context if violated. No-op on equal (equal is allowed — fully cut).
 *
 * Inputs accept string | number; coerced via Number. Non-finite inputs
 * throw — they're a programmer error, not a user-input issue.
 */
export function assertCutSumWithinStartingStock(input: {
  totalCutSum: string | number
  startingStock: string | number
}): void {
  const sum = Number(input.totalCutSum)
  const stock = Number(input.startingStock)
  if (!Number.isFinite(sum) || !Number.isFinite(stock)) {
    throw new CutLogDomainError("CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK", {
      totalCutSum: input.totalCutSum,
      startingStock: input.startingStock,
      reason: "non-finite-input",
    })
  }
  if (sum > stock) {
    throw new CutLogDomainError("CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK", {
      totalCutSum: sum,
      startingStock: stock,
      overage: sum - stock,
    })
  }
}

/**
 * Returns true if the invariant holds; false if it would be violated. Used
 * by validators (e.g. `diff/rules.ts`) that need to surface a validation
 * issue rather than throw.
 */
export function isCutSumWithinStartingStock(input: {
  totalCutSum: string | number
  startingStock: string | number
}): boolean {
  const sum = Number(input.totalCutSum)
  const stock = Number(input.startingStock)
  if (!Number.isFinite(sum) || !Number.isFinite(stock)) return false
  return sum <= stock
}
