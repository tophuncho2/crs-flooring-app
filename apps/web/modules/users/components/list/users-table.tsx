"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { UserListRow } from "@builders/domain"
import { USERS_LIST_COLUMNS } from "./table/users-list-columns"
import {
  createUserRowCellRenderer,
  type UserRowCellHandlers,
} from "./table/users-row-cell"

export function UsersTable({
  rows,
  pagination,
  handlers,
}: {
  rows: UserListRow[]
  pagination?: PaginateContract
  handlers: UserRowCellHandlers
}) {
  return (
    <DataTable<UserListRow>
      rows={rows}
      columns={USERS_LIST_COLUMNS}
      empty="No users found."
      renderCell={createUserRowCellRenderer(handlers)}
      pagination={pagination}
    />
  )
}
