import {
  LIST_ENTITY_TYPES_MAX_PAGE_SIZE,
  LIST_ENTITY_TYPES_PAGE_SIZE,
  type EntityTypeListRow,
} from "@builders/domain"
import { listEntityTypesForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type EntityTypesListFilters = {
  // Exact ET-number search (matches `entityTypeNumberInt`); accepts "7" or "ET-7".
  entityTypeNumber?: string
}

export async function listEntityTypesUseCase(
  input: ListInput<EntityTypesListFilters>,
): Promise<ListOutput<EntityTypeListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_ENTITY_TYPES_PAGE_SIZE)
  const pageSize = Math.max(
    1,
    Math.min(LIST_ENTITY_TYPES_MAX_PAGE_SIZE, requestedPageSize),
  )

  const search = input.search?.trim() || undefined
  const entityTypeNumber = input.filters?.entityTypeNumber?.trim() || undefined

  const { rows, total } = await listEntityTypesForListView({
    search,
    entityTypeNumber,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
