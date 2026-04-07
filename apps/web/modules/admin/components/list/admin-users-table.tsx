"use client"

import type { ReactNode } from "react"
import { DashboardListPageTable } from "@/modules/shared/engines/list-view/table/dashboard-list-page-table"
import { DashboardListRowCell } from "@/modules/shared/engines/list-view/table/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/modules/shared/engines/list-view/table/render-dashboard-row-cells"
import {
  ClickableTableRow,
  TableEmptyRow,
} from "@/modules/shared/engines/list-view/table/table-shell"
import { renderGroupedTableRows } from "@/modules/shared/engines/list-view/table/render-grouped-table-rows"
import type { GroupedRowTree } from "@/modules/shared/engines/list-view/controllers/use-table-controls"
import { formatStableDateTime } from "@builders/domain"
import type { ManagedUserRow } from "../../domain/types"

function StatusBadge({ isVerified }: { isVerified: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        isVerified
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-amber-500/10 text-amber-400"
      }`}
    >
      {isVerified ? "Verified" : "Pending"}
    </span>
  )
}

export function AdminUsersTable({
  rows,
  visibleColumns,
  groupedRows,
  isGroupingEnabled,
  onOpen,
}: {
  rows: ManagedUserRow[]
  visibleColumns: Array<{ key: string; label: string }>
  groupedRows: GroupedRowTree<ManagedUserRow>[]
  isGroupingEnabled: boolean
  onOpen: (row: ManagedUserRow) => void
}) {
  function renderRow(row: ManagedUserRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      email: (columnIndex) => <DashboardListRowCell key="email" columnIndex={columnIndex} className="font-medium">{row.email}</DashboardListRowCell>,
      role: (columnIndex) => <DashboardListRowCell key="role" columnIndex={columnIndex}>{row.role}</DashboardListRowCell>,
      status: (columnIndex) => <DashboardListRowCell key="status" columnIndex={columnIndex}><StatusBadge isVerified={row.isVerified} /></DashboardListRowCell>,
      createdAt: (columnIndex) => <DashboardListRowCell key="createdAt" columnIndex={columnIndex}>{formatStableDateTime(row.createdAt)}</DashboardListRowCell>,
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open user ${row.email}`} onClick={() => onOpen(row)}>
        {renderDashboardRowCells(visibleColumns, cells)}
      </ClickableTableRow>
    )
  }

  return (
    <DashboardListPageTable minWidthClass="min-w-[780px]" columns={visibleColumns}>
      {isGroupingEnabled
        ? renderGroupedTableRows({
            groups: groupedRows,
            colSpan: visibleColumns.length,
            renderRow,
          })
        : rows.map((row) => renderRow(row))}
      {rows.length === 0 ? <TableEmptyRow message="No users found." colSpan={visibleColumns.length} /> : null}
    </DashboardListPageTable>
  )
}
