"use client"

import {
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
  ListPageShell,
  ListHeaderPortal,
} from "@/engines/list-view"
import { LIST_USERS_PAGE_SIZE, type UserListRow } from "@builders/domain"
import {
  USERS_LIST_QUERY_KEY,
  listUsersRequest,
} from "@/modules/users/data/list-users-request"
import { useUsersListController } from "@/modules/users/controllers/list/use-users-list-controller"
import { UsersTable } from "./users-table"

export type UsersClientProps = {
  initialPage: number
}

// Read-only list — rows open the user record view, where rank + activation are
// edited. No mutations happen here.
export default function UsersClient({ initialPage }: UsersClientProps) {
  const { openUser } = useUsersListController()

  const {
    rows,
    total,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
  } = useFetchListController<UserListRow, Record<string, never>>({
    mode: "fetch",
    queryKey: [...USERS_LIST_QUERY_KEY],
    listFn: listUsersRequest,
    initialPage,
    pageSize: LIST_USERS_PAGE_SIZE,
    tableKey: "users-main",
    freshness: LIST_FRESHNESS_STANDARD,
  })

  return (
    <ListPageShell>
      <ListHeaderPortal
        label="Users"
        rowCount={rows.length}
        total={total}
        rowCountLabel="users"
      />
      <UsersTable
        rows={rows}
        onOpenUser={(row) => openUser(row.id)}
        pagination={{
          page,
          pageSize,
          totalItems: total,
          totalPages,
          hasPreviousPage,
          hasNextPage,
          onPreviousPage: goToPreviousPage,
          onNextPage: goToNextPage,
        }}
      />
    </ListPageShell>
  )
}
