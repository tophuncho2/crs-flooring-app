import {
  LIST_ENTITY_TYPES_MAX_PAGE_SIZE,
  LIST_ENTITY_TYPES_PAGE_SIZE,
  type EntityTypeListRow,
  type EntityTypeOption,
} from "@builders/domain"
import { listEntityTypesForListView, searchEntityTypeOptions } from "@builders/db"
import type { ListInput, ListOutput } from "../list-view/contracts.js"

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

export type SearchEntityTypeOptionsInput = {
  search?: string
  skip?: number
  take?: number
}

export type SearchEntityTypeOptionsResult = {
  items: EntityTypeOption[]
  hasMore: boolean
}

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

export async function searchEntityTypeOptionsUseCase(
  input: SearchEntityTypeOptionsInput,
): Promise<SearchEntityTypeOptionsResult> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? OPTIONS_DEFAULT_TAKE)
  const take = Math.max(1, Math.min(OPTIONS_MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchEntityTypeOptions({ search, skip, take })
}
