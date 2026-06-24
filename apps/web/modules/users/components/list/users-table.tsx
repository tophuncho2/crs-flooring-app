"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { UserListRow } from "@builders/domain"
import { USERS_LIST_COLUMNS } from "./table/users-list-columns"
import { renderUserRowCell } from "./table/users-row-cell"

export function UsersTable({
  rows,
  pagination,
}: {
  rows: UserListRow[]
  pagination?: PaginateContract
}) {
  return (
    <DataTable<UserListRow>
      rows={rows}
      columns={USERS_LIST_COLUMNS}
      empty="No users found."
      renderCell={renderUserRowCell}
      pagination={pagination}
    />
  )
}
