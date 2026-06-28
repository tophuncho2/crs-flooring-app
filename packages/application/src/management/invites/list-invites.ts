import {
  LIST_INVITES_MAX_PAGE_SIZE,
  LIST_INVITES_PAGE_SIZE,
  type InviteListRow,
} from "@builders/domain"
import { listInvitesForListView } from "@builders/db"
import type { ListInput, ListOutput } from "../../list-view/contracts.js"

// Read-only pending-invites list — no filters (bare data table). Typed empty
// filter map keeps the route/engine contract aligned with the users list.
export type InvitesListFilters = Record<string, never>

export async function listInvitesUseCase(
  input: ListInput<InvitesListFilters>,
): Promise<ListOutput<InviteListRow>> {
  const page = Math.max(1, Math.floor(input.page || 1))
  const requestedPageSize = Math.floor(input.pageSize || LIST_INVITES_PAGE_SIZE)
  const pageSize = Math.max(1, Math.min(LIST_INVITES_MAX_PAGE_SIZE, requestedPageSize))

  const { rows, total } = await listInvitesForListView(
    {
      skip: (page - 1) * pageSize,
      take: pageSize,
    },
    new Date(),
  )

  return { rows, total }
}
