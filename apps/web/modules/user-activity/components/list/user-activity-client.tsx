"use client"

import {
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
  ListPageShell,
  ListHeaderPortal,
} from "@/engines/list-view"
import {
  LIST_USER_LOGIN_ACTIVITY_PAGE_SIZE,
  type UserLoginActivityListRow,
} from "@builders/domain"
import {
  USER_ACTIVITY_LIST_QUERY_KEY,
  listUserActivityRequest,
} from "@/modules/user-activity/data/list-user-activity-request"
import { UserActivityTable } from "./user-activity-table"

export type UserActivityClientProps = {
  initialPage: number
}

// Read-only surface: bare DataTable + counted pagination. No toolbar, no search,
// no row-open. The source table is append-only (rows added on every login).
export default function UserActivityClient({ initialPage }: UserActivityClientProps) {
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
  } = useFetchListController<UserLoginActivityListRow, Record<string, never>>({
    mode: "fetch",
    queryKey: [...USER_ACTIVITY_LIST_QUERY_KEY],
    listFn: listUserActivityRequest,
    initialPage,
    pageSize: LIST_USER_LOGIN_ACTIVITY_PAGE_SIZE,
    tableKey: "user-activity-main",
    freshness: LIST_FRESHNESS_STANDARD,
  })

  return (
    <ListPageShell>
      <ListHeaderPortal
        label="Login Activity"
        rowCount={rows.length}
        total={total}
        rowCountLabel="logins"
      />
      <UserActivityTable
        rows={rows}
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
