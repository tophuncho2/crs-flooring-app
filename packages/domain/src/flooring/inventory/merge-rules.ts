import { computeInventoryBalance } from "./computed.js"
import { InventoryDomainError } from "./errors.js"
import { toInventoryFixedString } from "./formatters.js"

/**
 * Minimum number of source rows a merge consolidates. Merging a single row is a
 * no-op (use duplicate/edit instead); the form + use case both enforce this.
 */
export const MERGE_MIN_SOURCES = 2

/** A source inventory row as the merge rules need to see it (identity + stock). */
export type MergeSourceRow = {
  id: string
  productId: string
  startingStock: string
  netDeducted: string
  /** Already-consolidated rows are spent and must not be merged again. */
  wasMerged: boolean
}

/**
 * The merged row's starting stock = the total **remaining on-hand** across the
 * sources, i.e. Σ (startingStock − netDeducted). Adjustments do not carry over,
 * so the new row opens at this balance with `netDeducted` 0. Reuses the single
 * source-of-truth balance helper per row, then sums and fixes to 2 decimals to
 * match the `Decimal(12,2)` column.
 */
export function sumMergedStartingStock(sources: MergeSourceRow[]): string {
  const total = sources.reduce(
    (sum, row) =>
      sum +
      computeInventoryBalance({
        startingStock: row.startingStock,
        netDeducted: row.netDeducted,
      }),
    0,
  )
  return toInventoryFixedString(total)
}

/**
 * The cardinal merge invariant: a single merge transaction must never span more
 * than one product. Throws a named domain error if fewer than `MERGE_MIN_SOURCES`
 * rows are supplied, or if any source's product differs from the merge's product.
 * Referential validity (these ids resolve to rows of this product) is asserted in
 * the application/data layer under lock; this is the pure rule it calls.
 */
export function assertMergeSources(sources: MergeSourceRow[], productId: string): void {
  if (sources.length < MERGE_MIN_SOURCES) {
    throw new InventoryDomainError(
      "INVENTORY_MERGE_TOO_FEW_SOURCES",
      `A merge needs at least ${MERGE_MIN_SOURCES} inventory rows.`,
    )
  }
  const mismatched = sources.some((row) => row.productId !== productId)
  if (mismatched) {
    throw new InventoryDomainError(
      "INVENTORY_MERGE_CROSS_PRODUCT",
      "All merged inventory rows must belong to the same product.",
    )
  }
}

/**
 * Per-row eligibility for a merge, asserted under lock alongside
 * `assertMergeSources`. A row is ineligible if it has **no remaining balance**
 * (`startingStock − netDeducted ≤ 0` — nothing to consolidate) or was **already
 * merged** (`wasMerged` — spent; merging it again would double-count its stock).
 * The candidate picker hides both, so this is the server-side backstop for a
 * stale client, a direct API call, or a row that hit zero between load and submit.
 */
export function assertMergeSourcesEligible(sources: MergeSourceRow[]): void {
  const hasZeroBalance = sources.some(
    (row) =>
      computeInventoryBalance({
        startingStock: row.startingStock,
        netDeducted: row.netDeducted,
      }) <= 0,
  )
  if (hasZeroBalance) {
    throw new InventoryDomainError(
      "INVENTORY_MERGE_ZERO_BALANCE_SOURCE",
      "Inventory rows with no remaining balance cannot be merged.",
    )
  }
  const hasMerged = sources.some((row) => row.wasMerged)
  if (hasMerged) {
    throw new InventoryDomainError(
      "INVENTORY_MERGE_ALREADY_MERGED_SOURCE",
      "An already-merged inventory row cannot be merged again.",
    )
  }
}
