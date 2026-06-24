"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { UserLoginActivityListRow } from "@builders/domain"
import { USER_ACTIVITY_LIST_COLUMNS } from "./table/user-activity-list-columns"
import { renderUserActivityRowCell } from "./table/user-activity-row-cell"

export function UserActivityTable({
  rows,
  pagination,
}: {
  rows: UserLoginActivityListRow[]
  pagination?: PaginateContract
}) {
  return (
    <DataTable<UserLoginActivityListRow>
      rows={rows}
      columns={USER_ACTIVITY_LIST_COLUMNS}
      empty="No login activity yet."
      renderCell={renderUserActivityRowCell}
      pagination={pagination}
    />
  )
}
