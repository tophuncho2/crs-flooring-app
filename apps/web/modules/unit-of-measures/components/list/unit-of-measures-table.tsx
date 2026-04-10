"use client"

import type { ReactNode } from "react"
import { DashboardListPageTable } from "@/modules/shared/engines/list-view/table/dashboard-list-page-table"
import { DashboardListRowCell } from "@/modules/shared/engines/list-view/table/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/modules/shared/engines/list-view/table/render-dashboard-row-cells"
import {
  TableEmptyRow,
} from "@/modules/shared/engines/list-view/table/table-shell"
import { formatStableDateTime } from "@builders/domain"
import type { UnitOfMeasureRow } from "../../types"

export function UnitOfMeasuresTable({
  rows,
  visibleColumns,
}: {
  rows: UnitOfMeasureRow[]
  visibleColumns: Array<{ key: string; label: string }>
}) {
  function renderRow(row: UnitOfMeasureRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      name: (columnIndex) => <DashboardListRowCell key="name" columnIndex={columnIndex} className="font-medium">{row.name}</DashboardListRowCell>,
      createdAt: (columnIndex) => <DashboardListRowCell key="createdAt" columnIndex={columnIndex}>{formatStableDateTime(row.createdAt)}</DashboardListRowCell>,
    }

    return (
      <tr key={row.id} className="border-t border-[var(--panel-border)]">
        {renderDashboardRowCells(visibleColumns, cells)}
      </tr>
    )
  }

  return (
    <DashboardListPageTable minWidthClass="min-w-[780px]" columns={visibleColumns}>
      {rows.map((row) => renderRow(row))}
      {rows.length === 0 ? <TableEmptyRow message="No units of measure found." colSpan={visibleColumns.length} /> : null}
    </DashboardListPageTable>
  )
}
