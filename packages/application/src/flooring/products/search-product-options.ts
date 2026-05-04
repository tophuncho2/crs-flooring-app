import type { ProductPickerOption } from "@builders/domain"
import { searchProductOptions } from "@builders/db"

export type SearchProductOptionsInput = {
  search?: string
  categoryId?: string
  take?: number
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchProductOptionsUseCase(
  input: SearchProductOptionsInput,
): Promise<ProductPickerOption[]> {
  const search = input.search?.trim() || undefined
  const categoryId = input.categoryId?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  return searchProductOptions({ search, categoryId, take })
}
