import type { ImportRow } from "@builders/domain"
import { listImportsForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type ImportsListFilters = Record<string, never>

export const LIST_IMPORTS_PAGE_SIZE = 50
export const LIST_IMPORTS_MAX_PAGE_SIZE = 200

const ALLOWED_SORT_FIELDS = ["importNumber"] as const
const ALLOWED_GROUP_FIELDS = ["warehouse", "manufacturer"] as const

export type ListImportsAllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number]
export type ListImportsAllowedGroupField = (typeof ALLOWED_GROUP_FIELDS)[number]

export const LIST_IMPORTS_ALLOWED_SORT_FIELDS: ReadonlyArray<ListImportsAllowedSortField> = ALLOWED_SORT_FIELDS
export const LIST_IMPORTS_ALLOWED_GROUP_FIELDS: ReadonlyArray<ListImportsAllowedGroupField> = ALLOWED_GROUP_FIELDS

function isAllowedSortField(value: string): value is ListImportsAllowedSortField {
  return (ALLOWED_SORT_FIELDS as readonly string[]).includes(value)
}

function isAllowedGroupField(value: string): value is ListImportsAllowedGroupField {
  return (ALLOWED_GROUP_FIELDS as readonly string[]).includes(value)
}

export async function listImportsUseCase(
  input: ListInput<ImportsListFilters>,
): Promise<ListOutput<ImportRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_IMPORTS_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_IMPORTS_MAX_PAGE_SIZE, requestedPageSize))

  const sort = input.sort && isAllowedSortField(input.sort.field)
    ? { field: input.sort.field, direction: input.sort.direction }
    : { field: "importNumber" as const, direction: "asc" as const }

  const group = input.group && isAllowedGroupField(input.group.field)
    ? { field: input.group.field }
    : null

  const search = input.search?.trim() || undefined

  const { rows, total } = await listImportsForListView({
    search,
    sort,
    group,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
