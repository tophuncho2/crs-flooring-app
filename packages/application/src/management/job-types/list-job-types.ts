import {
  LIST_JOB_TYPES_MAX_PAGE_SIZE,
  LIST_JOB_TYPES_PAGE_SIZE,
  type JobTypeListRow,
} from "@builders/domain"
import { listJobTypesForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

export type JobTypesListFilters = Record<string, never>

export async function listJobTypesUseCase(
  input: ListInput<JobTypesListFilters>,
): Promise<ListOutput<JobTypeListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_JOB_TYPES_PAGE_SIZE)
  const pageSize = Math.max(
    1,
    Math.min(LIST_JOB_TYPES_MAX_PAGE_SIZE, requestedPageSize),
  )

  const search = input.search?.trim() || undefined

  const { rows, total } = await listJobTypesForListView({
    search,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
