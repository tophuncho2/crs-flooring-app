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
