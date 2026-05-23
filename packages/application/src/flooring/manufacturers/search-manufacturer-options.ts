import type { ManufacturerOption } from "@builders/domain"
import { searchManufacturerOptions } from "@builders/db"

export type SearchManufacturerOptionsInput = {
  search?: string
  skip?: number
  take?: number
}

export type SearchManufacturerOptionsResult = {
  items: ManufacturerOption[]
  hasMore: boolean
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchManufacturerOptionsUseCase(
  input: SearchManufacturerOptionsInput,
): Promise<SearchManufacturerOptionsResult> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchManufacturerOptions({ search, skip, take })
}
