import type { InventoryPurchaseOrderOption } from "@builders/domain"
import { searchInventoryPurchaseOrderOptions } from "@builders/db"

export type SearchInventoryPurchaseOrderOptionsInput = {
  /** Required scope — picker is warehouse-gated. */
  warehouseId: string
  /** Optional archive scope — mirrors the inventory list view. */
  isArchived?: boolean
  search?: string
  take?: number
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

/**
 * Distinct, warehouse-scoped `purchaseOrderNumber` snapshot values from
 * `flooring_inventory` for the inventory list's PO # filter chip. Same shape
 * as `searchInventoryImportNumberOptionsUseCase`.
 */
export async function searchInventoryPurchaseOrderOptionsUseCase(
  input: SearchInventoryPurchaseOrderOptionsInput,
): Promise<InventoryPurchaseOrderOption[]> {
  const warehouseId = input.warehouseId.trim()
  if (!warehouseId) return []
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  return searchInventoryPurchaseOrderOptions({
    warehouseId,
    ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
    ...(search ? { search } : {}),
    take,
  })
}
