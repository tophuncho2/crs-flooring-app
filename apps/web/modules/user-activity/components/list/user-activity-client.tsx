"use client"

import { useFetchListController, LIST_FRESHNESS_STANDARD } from "@/engines/list-view"
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
    <div className="min-h-screen space-y-3 bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="mx-4">
        <div className="pb-2">
          <span className="inline-block rounded-md border border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
            Login Activity
          </span>
        </div>
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
      </div>
    </div>
  )
}
