import type { InventoryImportNumberOption } from "@builders/domain"
import { searchInventoryImportNumbers } from "@builders/db"

export type SearchInventoryImportNumbersInput = {
  search?: string
  skip?: number
  take?: number
}

export type SearchInventoryImportNumbersResult = {
  items: InventoryImportNumberOption[]
  hasMore: boolean
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchInventoryImportNumbersUseCase(
  input: SearchInventoryImportNumbersInput,
): Promise<SearchInventoryImportNumbersResult> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchInventoryImportNumbers({
    search,
    skip,
    take,
  })
}
