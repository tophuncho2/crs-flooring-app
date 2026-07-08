"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { UserListRow } from "@builders/domain"
import { USERS_LIST_COLUMNS } from "./table/users-list-columns"
import { renderUserRowCell } from "./table/users-row-cell"

export function UsersTable({
  rows,
  onOpenUser,
  pagination,
  columnWidths,
  onColumnWidthsChange,
}: {
  rows: UserListRow[]
  onOpenUser: (row: UserListRow) => void
  pagination?: PaginateContract
  /** Persisted column widths (px) + setter — the DataTable resize seam. */
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
}) {
  return (
    <DataTable<UserListRow>
      fill
      resizable
      rows={rows}
      columns={USERS_LIST_COLUMNS}
      empty="No users found."
      onOpenRow={(row) => onOpenUser(row)}
      getRowAriaLabel={(row) => `Open user ${row.email}`}
      renderCell={renderUserRowCell}
      pagination={pagination}
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
