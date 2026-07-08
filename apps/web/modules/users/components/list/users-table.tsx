"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { UserListRow } from "@builders/domain"
import { USERS_LIST_COLUMNS } from "./table/users-list-columns"
import { renderUserRowCell } from "./table/users-row-cell"

export function UsersTable({
  rows,
  onOpenUser,
  pagination,
}: {
  rows: UserListRow[]
  onOpenUser: (row: UserListRow) => void
  pagination?: PaginateContract
}) {
  return (
    <DataTable<UserListRow>
      fill
      rows={rows}
      columns={USERS_LIST_COLUMNS}
      empty="No users found."
      onOpenRow={(row) => onOpenUser(row)}
      getRowAriaLabel={(row) => `Open user ${row.email}`}
      renderCell={renderUserRowCell}
      pagination={pagination}
    />
  )
}
