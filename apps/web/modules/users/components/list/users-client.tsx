"use client"

import { useFetchListController, LIST_FRESHNESS_STANDARD } from "@/engines/list-view"
import { LIST_USERS_PAGE_SIZE, type UserListRow } from "@builders/domain"
import {
  USERS_LIST_QUERY_KEY,
  listUsersRequest,
} from "@/modules/users/data/list-users-request"
import { UsersTable } from "./users-table"

export type UsersClientProps = {
  initialPage: number
}

// Read-only surface: bare DataTable + counted pagination. No toolbar, no search,
// no row-open — the engine controller only feeds rows + page state.
export default function UsersClient({ initialPage }: UsersClientProps) {
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
    <div className="min-h-screen space-y-3 bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="mx-4">
        <div className="pb-2">
          <span className="inline-block rounded-md border border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
            Users
          </span>
        </div>
        <UsersTable
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
