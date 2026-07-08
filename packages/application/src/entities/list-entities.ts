import {
  LIST_ENTITIES_MAX_PAGE_SIZE,
  LIST_ENTITIES_PAGE_SIZE,
  normalizeIdFilter,
  normalizeStateCodeFilter,
  type EntityListRow,
  type EntityOption,
} from "@builders/domain"
import {
  listEntitiesForListView,
  searchEntityOptions,
} from "@builders/db"
import type { ListInput, ListOutput } from "../list-view/contracts.js"

/** Cap on user-selected sort columns (the engine + API enforce the same). */
const MAX_SORT_LEVELS = 3

export type EntitiesListFilters = {
  /** Exact-int ENT-# bar — strip-non-digits handled in the data layer. */
  entityNumber?: string
  state?: ReadonlyArray<string>
  entityTypeIds?: ReadonlyArray<string>
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
  const entityNumber = input.filters?.entityNumber?.trim() || undefined
  const state = normalizeStateCodeFilter(input.filters?.state)
  const entityTypeIds = normalizeIdFilter(input.filters?.entityTypeIds)

  const filters =
    entityNumber || state || entityTypeIds
      ? {
          ...(entityNumber ? { entityNumber } : {}),
          ...(state ? { state } : {}),
          ...(entityTypeIds ? { entityTypeIds } : {}),
        }
      : undefined

  // The multi-column `sorts` array is canonical; a single `sort` is treated as
  // an array of one. Highest priority first, capped at MAX_SORT_LEVELS. The repo
  // silently drops unknown fields, so no field whitelist is needed here.
  const sortList = input.sorts ?? (input.sort ? [input.sort] : [])
  const entries = sortList
    .slice(0, MAX_SORT_LEVELS)
    .map((entry) => ({ field: entry.field, direction: entry.direction }))
  const sort = entries.length > 0 ? { entries } : undefined

  const { rows, total } = await listEntitiesForListView({
    search,
    sort,
    filters,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}

export type SearchEntityOptionsInput = {
  search?: string
  typeIds?: ReadonlyArray<string>
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
  const typeIds = normalizeIdFilter(input.typeIds)
  const requested = Math.floor(input.take ?? OPTIONS_DEFAULT_TAKE)
  const take = Math.max(1, Math.min(OPTIONS_MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchEntityOptions({ search, typeIds, skip, take })
}
