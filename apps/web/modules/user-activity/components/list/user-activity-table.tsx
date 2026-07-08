"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { UserLoginActivityListRow } from "@builders/domain"
import { USER_ACTIVITY_LIST_COLUMNS } from "./table/user-activity-list-columns"
import { renderUserActivityRowCell } from "./table/user-activity-row-cell"

export function UserActivityTable({
  rows,
  pagination,
  columnWidths,
  onColumnWidthsChange,
}: {
  rows: UserLoginActivityListRow[]
  pagination?: PaginateContract
  /** Persisted column widths (px) + setter — the DataTable resize seam. */
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
}) {
  return (
    <DataTable<UserLoginActivityListRow>
      fill
      resizable
      rows={rows}
      columns={USER_ACTIVITY_LIST_COLUMNS}
      empty="No login activity yet."
      renderCell={renderUserActivityRowCell}
      pagination={pagination}
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
