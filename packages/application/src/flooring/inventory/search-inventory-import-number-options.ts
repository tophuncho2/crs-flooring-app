import type { InventoryImportNumberOption } from "@builders/domain"
import { searchInventoryImportNumberOptions } from "@builders/db"

export type SearchInventoryImportNumberOptionsInput = {
  /** Required scope — picker is warehouse-gated. */
  warehouseId: string
  /**
   * Optional archive scope — mirrors the inventory list view's archive
   * segmented control so the chip surfaces only import #'s with at least one
   * inventory row in the same scope the list is currently rendering.
   */
  isArchived?: boolean
  search?: string
  take?: number
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

/**
 * Distinct, warehouse-scoped `importNumber` snapshot values from
 * `flooring_inventory` for the inventory list's Import # filter chip. Mirrors
 * `searchInventoryLocationsForWarehouseUseCase`: trims, clamps `take`, delegates
 * to the read repo. Returns [] for an empty warehouseId so the picker can stay
 * disabled until a warehouse is picked.
 */
export async function searchInventoryImportNumberOptionsUseCase(
  input: SearchInventoryImportNumberOptionsInput,
): Promise<InventoryImportNumberOption[]> {
  const warehouseId = input.warehouseId.trim()
  if (!warehouseId) return []
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  return searchInventoryImportNumberOptions({
    warehouseId,
    ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
    ...(search ? { search } : {}),
    take,
  })
}
