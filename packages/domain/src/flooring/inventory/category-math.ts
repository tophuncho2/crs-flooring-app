import { convertStockToCoverage } from "../categories/conversions.js"
import type { CategoryMeta } from "../categories/types.js"

export function computeInventoryAvailableCoverage(input: {
  availableBalance: number
  coveragePerUnit: number | null
  category: Pick<CategoryMeta, "slug"> | { slug: string | null }
}): number | null {
  return convertStockToCoverage({
    stockAmount: input.availableBalance,
    coveragePerUnit: input.coveragePerUnit,
    categorySlug: input.category.slug,
  })
}
