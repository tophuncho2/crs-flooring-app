import {
  LIST_MANUFACTURERS_MAX_PAGE_SIZE,
  LIST_MANUFACTURERS_PAGE_SIZE,
  type ManufacturerListRow,
} from "@builders/domain"
import { listManufacturersForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type ManufacturersListFilters = Record<string, never>

export async function listManufacturersUseCase(
  input: ListInput<ManufacturersListFilters>,
): Promise<ListOutput<ManufacturerListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_MANUFACTURERS_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_MANUFACTURERS_MAX_PAGE_SIZE, requestedPageSize))

  const search = input.search?.trim() || undefined

  const { rows, total } = await listManufacturersForListView({
    search,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
