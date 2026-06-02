import type { InventoryPurchaseOrderOption } from "@builders/domain"
import { searchInventoryPurchaseOrderNumbers } from "@builders/db"

export type SearchInventoryPurchaseOrderNumbersInput = {
  search?: string
  skip?: number
  take?: number
}

export type SearchInventoryPurchaseOrderNumbersResult = {
  items: InventoryPurchaseOrderOption[]
  hasMore: boolean
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchInventoryPurchaseOrderNumbersUseCase(
  input: SearchInventoryPurchaseOrderNumbersInput,
): Promise<SearchInventoryPurchaseOrderNumbersResult> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchInventoryPurchaseOrderNumbers({
    search,
    skip,
    take,
  })
}
