import {
  LIST_UNIT_OF_MEASURES_MAX_PAGE_SIZE,
  LIST_UNIT_OF_MEASURES_PAGE_SIZE,
  type UnitOfMeasureListRow,
} from "@builders/domain"
import { listUnitOfMeasuresForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type UnitOfMeasuresListFilters = Record<string, never>

export async function listUnitOfMeasuresUseCase(
  input: ListInput<UnitOfMeasuresListFilters>,
): Promise<ListOutput<UnitOfMeasureListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_UNIT_OF_MEASURES_PAGE_SIZE)
  const pageSize = Math.max(
    1,
    Math.min(LIST_UNIT_OF_MEASURES_MAX_PAGE_SIZE, requestedPageSize),
  )

  const { rows, total } = await listUnitOfMeasuresForListView({
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
