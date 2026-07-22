import {
  LIST_INVENTORY_AGE_INDICATORS_MAX_PAGE_SIZE,
  LIST_INVENTORY_AGE_INDICATORS_PAGE_SIZE,
  type InventoryAgeIndicatorListRow,
} from "@builders/domain"
import { listInventoryAgeIndicatorsForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../list-view/contracts.js"

// The age-indicators list has no filters or search — the order is locked ASC by
// `days`. The filters slot stays empty so the shared ListInput contract still fits.
export type InventoryAgeIndicatorsListFilters = Record<string, never>

export async function listInventoryAgeIndicatorsUseCase(
  input: ListInput<InventoryAgeIndicatorsListFilters>,
): Promise<ListOutput<InventoryAgeIndicatorListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(
    input.pageSize || LIST_INVENTORY_AGE_INDICATORS_PAGE_SIZE,
  )
  const pageSize = Math.max(
    1,
    Math.min(LIST_INVENTORY_AGE_INDICATORS_MAX_PAGE_SIZE, requestedPageSize),
  )

  const { rows, total } = await listInventoryAgeIndicatorsForListView({
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
