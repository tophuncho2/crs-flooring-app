import { convertStockToCoverage } from "../../../categories/conversions.js"
import type { CategoryMeta } from "../../../categories/types.js"

export function computeAdjustmentCoverage(input: {
  quantity: number
  coveragePerUnit: number | null
  category: Pick<CategoryMeta, "slug"> | { slug: string | null }
}): number | null {
  return convertStockToCoverage({
    stockAmount: input.quantity,
    coveragePerUnit: input.coveragePerUnit,
    categorySlug: input.category.slug,
  })
}

export function deriveAdjustmentCoverageString(input: {
  quantity: string
  coveragePerUnit: string | null
  categorySlug: string
}): string | null {
  const quantityNum = Number(input.quantity)
  if (!Number.isFinite(quantityNum)) return null
  const coveragePerUnitNum =
    input.coveragePerUnit === null ? null : Number(input.coveragePerUnit)
  const result = computeAdjustmentCoverage({
    quantity: quantityNum,
    coveragePerUnit: coveragePerUnitNum,
    category: { slug: input.categorySlug },
  })
  return result === null ? null : result.toFixed(2)
}
