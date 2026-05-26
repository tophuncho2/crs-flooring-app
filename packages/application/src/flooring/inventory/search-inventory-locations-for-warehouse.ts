import type { InventoryLocationOption } from "@builders/domain"
import { searchInventoryLocationsForWarehouse } from "@builders/db"

export type SearchInventoryLocationsForWarehouseInput = {
  warehouseId: string
  search?: string
  skip?: number
  take?: number
}

export type SearchInventoryLocationsForWarehouseResult = {
  items: InventoryLocationOption[]
  hasMore: boolean
}

const DEFAULT_TAKE = 20
const MAX_TAKE = 50

/**
 * Distinct, warehouse-scoped location values for the cut-log create form's
 * LocationPicker. Mirrors the shape of `searchInventoryOptionsUseCase`: trims
 * inputs, clamps `take` to [1, MAX_TAKE], delegates to the read repo. Locations
 * are not a separate entity — values are derived from the inventory table.
 */
export async function searchInventoryLocationsForWarehouseUseCase(
  input: SearchInventoryLocationsForWarehouseInput,
): Promise<SearchInventoryLocationsForWarehouseResult> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchInventoryLocationsForWarehouse({
    warehouseId: input.warehouseId,
    search,
    skip,
    take,
  })
}
