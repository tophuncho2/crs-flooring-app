import type { ConversionFormulaOption } from "@builders/domain"
import { searchConversionFormulaOptions } from "@builders/db"

export type SearchConversionFormulaOptionsInput = {
  search?: string
  skip?: number
  take?: number
}

export type SearchConversionFormulaOptionsResult = {
  items: ConversionFormulaOption[]
  hasMore: boolean
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchConversionFormulaOptionsUseCase(
  input: SearchConversionFormulaOptionsInput,
): Promise<SearchConversionFormulaOptionsResult> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchConversionFormulaOptions({ search, skip, take })
}
