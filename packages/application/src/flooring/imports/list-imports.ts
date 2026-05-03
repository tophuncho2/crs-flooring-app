import {
  LIST_IMPORTS_ALLOWED_GROUP_FIELDS,
  LIST_IMPORTS_MAX_PAGE_SIZE,
  LIST_IMPORTS_PAGE_SIZE,
  type ImportRow,
  type ListImportsAllowedGroupField,
} from "@builders/domain"
import { listImportsForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type ImportsListFilters = Record<string, never>

function isAllowedGroupField(value: string): value is ListImportsAllowedGroupField {
  return (LIST_IMPORTS_ALLOWED_GROUP_FIELDS as readonly string[]).includes(value)
}

export async function listImportsUseCase(
  input: ListInput<ImportsListFilters>,
): Promise<ListOutput<ImportRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_IMPORTS_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_IMPORTS_MAX_PAGE_SIZE, requestedPageSize))

  const group = input.group && isAllowedGroupField(input.group.field)
    ? { field: input.group.field }
    : null

  const search = input.search?.trim() || undefined

  const { rows, total } = await listImportsForListView({
    search,
    group,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
