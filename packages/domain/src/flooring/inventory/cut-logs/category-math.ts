import { convertStockToCoverage } from "../../categories/conversions.js"
import type { CategoryMeta } from "../../categories/types.js"

export function computeCutCoverage(input: {
  cut: number
  coveragePerUnit: number | null
  category: Pick<CategoryMeta, "slug"> | { slug: string | null }
}): number | null {
  return convertStockToCoverage({
    stockAmount: input.cut,
    coveragePerUnit: input.coveragePerUnit,
    categorySlug: input.category.slug,
  })
}

/**
 * String-formatting wrapper around `computeCutCoverage`, matching the
 * `Decimal(12,2)` precision the cut-log schema column uses. Pure: takes
 * the same inputs the data layer surfaces (decimals as strings, slug
 * non-null), returns `string | null` ready to write.
 *
 * Returns null when:
 *   - `cut` is not a finite number (defensive — domain form validation
 *     should have rejected this upstream, but the helper is still
 *     null-safe).
 *   - `coveragePerUnit` is null (the parent inventory has no coverage
 *     setting).
 *   - The category does not support coverage (delegated to
 *     `computeCutCoverage` → `convertStockToCoverage`).
 *
 * Otherwise returns the coverage amount formatted to two decimals.
 */
export function deriveCutLogCoverageCutString(input: {
  cut: string
  coveragePerUnit: string | null
  categorySlug: string
}): string | null {
  const cutNum = Number(input.cut)
  if (!Number.isFinite(cutNum)) return null
  const coveragePerUnitNum =
    input.coveragePerUnit === null ? null : Number(input.coveragePerUnit)
  const result = computeCutCoverage({
    cut: cutNum,
    coveragePerUnit: coveragePerUnitNum,
    category: { slug: input.categorySlug },
  })
  return result === null ? null : result.toFixed(2)
}
