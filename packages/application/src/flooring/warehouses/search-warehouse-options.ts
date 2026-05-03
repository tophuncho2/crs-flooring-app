import type { WarehouseOption } from "@builders/domain"
import { searchWarehouseOptions } from "@builders/db"

export type SearchWarehouseOptionsInput = {
  search?: string
  take?: number
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchWarehouseOptionsUseCase(
  input: SearchWarehouseOptionsInput,
): Promise<WarehouseOption[]> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  return searchWarehouseOptions({ search, take })
}
