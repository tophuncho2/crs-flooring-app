import type { CategoryOption } from "@builders/domain"
import { searchCategoryOptions } from "@builders/db"

export type SearchCategoryOptionsInput = {
  search?: string
  take?: number
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchCategoryOptionsUseCase(
  input: SearchCategoryOptionsInput,
): Promise<CategoryOption[]> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  return searchCategoryOptions({ search, take })
}
