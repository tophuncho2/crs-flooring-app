import {
  LIST_USERS_MAX_PAGE_SIZE,
  LIST_USERS_PAGE_SIZE,
  type UserListRow,
} from "@builders/domain"
import { listUsersForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

// Read-only list — no filters yet (the surface is a bare data table). Kept as a
// typed empty filter map so the route/engine contract matches the job-types
// shape and a future search/filter can slot in without a signature change.
export type UsersListFilters = Record<string, never>

export async function listUsersUseCase(
  input: ListInput<UsersListFilters>,
): Promise<ListOutput<UserListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_USERS_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_USERS_MAX_PAGE_SIZE, requestedPageSize))

  const { rows, total } = await listUsersForListView({
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
