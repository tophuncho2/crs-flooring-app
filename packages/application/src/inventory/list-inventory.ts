import {
  LIST_INVENTORY_MAX_PAGE_SIZE,
  LIST_INVENTORY_PAGE_SIZE,
  type InventoryRow,
} from "@builders/domain"
import { listInventoryForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../list-view/contracts.js"
import {
  resolveInventoryListFilters,
  resolveInventoryListSort,
  type InventoryListFilters,
} from "./list-inventory-input.js"

export type { InventoryListFilters } from "./list-inventory-input.js"

export async function listInventoryUseCase(
  input: ListInput<InventoryListFilters>,
): Promise<ListOutput<InventoryRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_INVENTORY_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_INVENTORY_MAX_PAGE_SIZE, requestedPageSize))

  const filters = resolveInventoryListFilters(input.filters)
  const sort = resolveInventoryListSort(input)

  const { rows, total, totals } = await listInventoryForListView({
    ...(filters ? { filters } : {}),
    ...(sort ? { sort } : {}),
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total, totals }
}
