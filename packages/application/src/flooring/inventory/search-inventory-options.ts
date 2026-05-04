import type { InventoryOption } from "@builders/domain"
import { searchInventoryOptions } from "@builders/db"

export type SearchInventoryOptionsInput = {
  warehouseId: string
  productId?: string
  sectionId?: string
  locationId?: string
  search?: string
  take?: number
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

export async function searchInventoryOptionsUseCase(
  input: SearchInventoryOptionsInput,
): Promise<InventoryOption[]> {
  const search = input.search?.trim() || undefined
  const productId = input.productId?.trim() || undefined
  const sectionId = input.sectionId?.trim() || undefined
  const locationId = input.locationId?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  return searchInventoryOptions({
    warehouseId: input.warehouseId,
    productId,
    sectionId,
    locationId,
    search,
    take,
  })
}
