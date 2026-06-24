import {
  LIST_ENTITIES_MAX_PAGE_SIZE,
  LIST_ENTITIES_PAGE_SIZE,
  normalizeStateCodeFilter,
  type EntityListRow,
  type EntityOption,
} from "@builders/domain"
import {
  listEntitiesForListView,
  searchEntityOptions,
} from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type EntitiesListFilters = {
  state?: ReadonlyArray<string>
}

export async function listEntitiesUseCase(
  input: ListInput<EntitiesListFilters>,
): Promise<ListOutput<EntityListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_ENTITIES_PAGE_SIZE)
  const pageSize = Math.max(
    1,
    Math.min(LIST_ENTITIES_MAX_PAGE_SIZE, requestedPageSize),
  )

  const search = input.search?.trim() || undefined
  const state = normalizeStateCodeFilter(input.filters?.state)

  const { rows, total } = await listEntitiesForListView({
    search,
    filters: state ? { state } : undefined,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}

export type SearchEntityOptionsInput = {
  search?: string
  skip?: number
  take?: number
}

export type SearchEntityOptionsResult = {
  items: EntityOption[]
  hasMore: boolean
}

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

export async function searchEntityOptionsUseCase(
  input: SearchEntityOptionsInput,
): Promise<SearchEntityOptionsResult> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? OPTIONS_DEFAULT_TAKE)
  const take = Math.max(1, Math.min(OPTIONS_MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchEntityOptions({ search, skip, take })
}
