import type { UnitOfMeasureOption } from "@builders/domain"
import { searchUnitOfMeasureOptions } from "@builders/db"

export type SearchUnitOfMeasureOptionsInput = {
  search?: string
  skip?: number
  take?: number
}

export type SearchUnitOfMeasureOptionsResult = {
  items: UnitOfMeasureOption[]
  hasMore: boolean
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchUnitOfMeasureOptionsUseCase(
  input: SearchUnitOfMeasureOptionsInput,
): Promise<SearchUnitOfMeasureOptionsResult> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchUnitOfMeasureOptions({ search, skip, take })
}
