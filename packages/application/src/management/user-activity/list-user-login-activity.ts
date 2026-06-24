import {
  LIST_USER_LOGIN_ACTIVITY_MAX_PAGE_SIZE,
  LIST_USER_LOGIN_ACTIVITY_PAGE_SIZE,
  type UserLoginActivityListRow,
} from "@builders/domain"
import { listUserLoginActivityForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

// Read-only, append-only login log — no filters yet (bare data table). Typed
// empty filter map keeps the route/engine contract aligned with job-types.
export type UserLoginActivityListFilters = Record<string, never>

export async function listUserLoginActivityUseCase(
  input: ListInput<UserLoginActivityListFilters>,
): Promise<ListOutput<UserLoginActivityListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(
    input.pageSize || LIST_USER_LOGIN_ACTIVITY_PAGE_SIZE,
  )
  const pageSize = Math.max(
    1,
    Math.min(LIST_USER_LOGIN_ACTIVITY_MAX_PAGE_SIZE, requestedPageSize),
  )

  const { rows, total } = await listUserLoginActivityForListView({
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return { rows, total }
}
