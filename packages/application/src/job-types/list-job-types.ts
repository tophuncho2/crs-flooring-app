import {
  LIST_JOB_TYPES_MAX_PAGE_SIZE,
  LIST_JOB_TYPES_PAGE_SIZE,
  type JobTypeListRow,
} from "@builders/domain"
import { listJobTypesForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../list-view/contracts.js"

export type JobTypesListFilters = {
  // Exact JT-number search (matches `jobTypeNumberInt`); accepts "7" or "JT-7".
  jobTypeNumber?: string
}

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
  const jobTypeNumber = input.filters?.jobTypeNumber?.trim() || undefined

  const { rows, total } = await listJobTypesForListView({
    search,
    jobTypeNumber,
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
