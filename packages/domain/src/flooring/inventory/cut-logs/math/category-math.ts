import { convertStockToCoverage } from "../../../categories/conversions.js"
import type { CategoryMeta } from "../../../categories/types.js"

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
