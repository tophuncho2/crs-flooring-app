import type { LocationOption } from "@builders/domain"
import { searchLocationOptions } from "@builders/db"

export type SearchLocationOptionsInput = {
  warehouseId: string
  search?: string
  take?: number
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchLocationOptionsUseCase(
  input: SearchLocationOptionsInput,
): Promise<LocationOption[]> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  return searchLocationOptions({ warehouseId: input.warehouseId, search, take })
}
