"use client"

import type { ReactNode } from "react"
import { DashboardListPageTable } from "@/modules/shared/engines/list-view/table/dashboard-list-page-table"
import { DashboardListRowCell } from "@/modules/shared/engines/list-view/table/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/modules/shared/engines/list-view/table/render-dashboard-row-cells"
import {
  TableEmptyRow,
} from "@/modules/shared/engines/list-view/table/table-shell"
import { renderGroupedTableRows } from "@/modules/shared/engines/list-view/table/render-grouped-table-rows"
import type { GroupedRowTree } from "@/modules/shared/engines/list-view/controllers/use-table-controls"
import { formatStableDateTime } from "@builders/domain"
import type { UnitOfMeasureRow } from "../../types"

export function UnitOfMeasuresTable({
  rows,
  visibleColumns,
  groupedRows,
  isGroupingEnabled,
}: {
  rows: UnitOfMeasureRow[]
  visibleColumns: Array<{ key: string; label: string }>
  groupedRows: GroupedRowTree<UnitOfMeasureRow>[]
  isGroupingEnabled: boolean
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
      {isGroupingEnabled
        ? renderGroupedTableRows({
            groups: groupedRows,
            colSpan: visibleColumns.length,
            renderRow,
          })
        : rows.map((row) => renderRow(row))}
      {rows.length === 0 ? <TableEmptyRow message="No units of measure found." colSpan={visibleColumns.length} /> : null}
    </DashboardListPageTable>
  )
}
