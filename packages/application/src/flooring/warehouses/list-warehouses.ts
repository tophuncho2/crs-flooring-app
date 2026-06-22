import {
  LIST_WAREHOUSES_MAX_PAGE_SIZE,
  LIST_WAREHOUSES_PAGE_SIZE,
  type WarehouseListRow,
} from "@builders/domain"
import { listWarehousesForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type WarehousesListFilters = {
  // Exact store-number search (matches `warehouseNumberInt`); accepts "7" or "STORE-7".
  storeNumber?: string
}

export async function listWarehousesUseCase(
  input: ListInput<WarehousesListFilters>,
): Promise<ListOutput<WarehouseListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_WAREHOUSES_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_WAREHOUSES_MAX_PAGE_SIZE, requestedPageSize))

  const search = input.search?.trim() || undefined
  const storeNumber = input.filters?.storeNumber?.trim() || undefined

  const { rows, total } = await listWarehousesForListView({
    search,
    storeNumber,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
