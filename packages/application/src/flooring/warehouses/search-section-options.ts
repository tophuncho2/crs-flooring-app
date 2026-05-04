import type { SectionOption } from "@builders/domain"
import { searchSectionOptions } from "@builders/db"

export type SearchSectionOptionsInput = {
  warehouseId: string
  search?: string
  take?: number
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchSectionOptionsUseCase(
  input: SearchSectionOptionsInput,
): Promise<SectionOption[]> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  return searchSectionOptions({ warehouseId: input.warehouseId, search, take })
}
