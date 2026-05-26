import type { InventoryOption } from "@builders/domain"
import { searchInventoryOptions } from "@builders/db"

export type SearchInventoryOptionsInput = {
  warehouseId: string
  productId?: string
  /**
   * Free-text location filter chip. Server-side ILIKE on `inventory.location`.
   * Used by the cut-log side panel inventory picker (work-orders module);
   * independent from the search bar (which targets `inventoryItem`).
   */
  location?: string
  search?: string
  skip?: number
  take?: number
}

export type SearchInventoryOptionsResult = {
  items: InventoryOption[]
  hasMore: boolean
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchInventoryOptionsUseCase(
  input: SearchInventoryOptionsInput,
): Promise<SearchInventoryOptionsResult> {
  const search = input.search?.trim() || undefined
  const productId = input.productId?.trim() || undefined
  const location = input.location?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchInventoryOptions({
    warehouseId: input.warehouseId,
    productId,
    location,
    search,
    skip,
    take,
  })
}
