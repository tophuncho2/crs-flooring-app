import type { InventoryOption } from "@builders/domain"
import { searchInventoryOptions } from "@builders/db"

export type SearchInventoryOptionsInput = {
  warehouseId: string
  productId?: string
  location?: string
  invNumber?: string
  rollNumber?: string
  dyeLot?: string
  note?: string
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
  const productId = input.productId?.trim() || undefined
  const location = input.location?.trim() || undefined
  const invNumber = input.invNumber?.trim() || undefined
  const rollNumber = input.rollNumber?.trim() || undefined
  const dyeLot = input.dyeLot?.trim() || undefined
  const note = input.note?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchInventoryOptions({
    warehouseId: input.warehouseId,
    productId,
    location,
    invNumber,
    rollNumber,
    dyeLot,
    note,
    skip,
    take,
  })
}
