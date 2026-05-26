import type { CategoryOption } from "@builders/domain"
import { searchCategoryOptions } from "@builders/db"

export type SearchCategoryOptionsInput = {
  search?: string
  skip?: number
  take?: number
}

export type SearchCategoryOptionsResult = {
  items: CategoryOption[]
  hasMore: boolean
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchCategoryOptionsUseCase(
  input: SearchCategoryOptionsInput,
): Promise<SearchCategoryOptionsResult> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchCategoryOptions({ search, skip, take })
}
