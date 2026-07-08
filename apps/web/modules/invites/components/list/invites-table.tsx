"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { InviteListRow } from "@builders/domain"
import { INVITES_LIST_COLUMNS } from "./table/invites-list-columns"
import { renderInviteRowCell } from "./table/invites-row-cell"

export function InvitesTable({
  rows,
  onOpenInvite,
  pagination,
  columnWidths,
  onColumnWidthsChange,
}: {
  rows: InviteListRow[]
  onOpenInvite: (row: InviteListRow) => void
  pagination?: PaginateContract
  /** Persisted column widths (px) + setter — the DataTable resize seam. */
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
}) {
  return (
    <DataTable<InviteListRow>
      fill
      resizable
      rows={rows}
      columns={INVITES_LIST_COLUMNS}
      empty="No pending invites."
      onOpenRow={(row) => onOpenInvite(row)}
      getRowAriaLabel={(row) => `Open invite ${row.email}`}
      renderCell={renderInviteRowCell}
      pagination={pagination}
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
