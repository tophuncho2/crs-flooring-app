import type { WarehouseOption } from "@builders/domain"
import { searchWarehouseOptions } from "@builders/db"

export type SearchWarehouseOptionsInput = {
  search?: string
  skip?: number
  take?: number
}

export type SearchWarehouseOptionsResult = {
  items: WarehouseOption[]
  hasMore: boolean
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchWarehouseOptionsUseCase(
  input: SearchWarehouseOptionsInput,
): Promise<SearchWarehouseOptionsResult> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchWarehouseOptions({ search, skip, take })
}
