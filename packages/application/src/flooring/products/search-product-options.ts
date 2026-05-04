import { searchProductOptions } from "@builders/db"
import type { ProductOption } from "@builders/domain"

export type SearchProductOptionsInput = {
  search?: string
  categoryId?: string
  take?: number
}

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

export async function searchProductOptionsUseCase(
  input: SearchProductOptionsInput,
): Promise<ProductOption[]> {
  const search = input.search?.trim() || undefined
  const categoryId = input.categoryId?.trim() || undefined
  const requested = Math.floor(input.take ?? OPTIONS_DEFAULT_TAKE)
  const take = Math.max(1, Math.min(OPTIONS_MAX_TAKE, requested))
  return searchProductOptions({ search, categoryId, take })
}
