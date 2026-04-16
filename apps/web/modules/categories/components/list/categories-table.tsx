"use client"

import type { ReactNode } from "react"
import { DashboardListPageTable } from "@/modules/shared/engines/list-view/table/dashboard-list-page-table"
import { DashboardListRowCell } from "@/modules/shared/engines/list-view/table/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/modules/shared/engines/list-view/table/render-dashboard-row-cells"
import { TableEmptyRow } from "@/modules/shared/engines/list-view/table/table-shell"
import type { CategoryRow } from "../../types"

export function CategoriesTable({
  rows,
  visibleColumns,
}: {
  rows: CategoryRow[]
  visibleColumns: Array<{ key: string; label: string }>
}) {
  function renderRow(row: CategoryRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      name: (columnIndex) => <DashboardListRowCell key="name" columnIndex={columnIndex} className="font-medium">{row.name}</DashboardListRowCell>,
      sendUnit: (columnIndex) => <DashboardListRowCell key="sendUnit" columnIndex={columnIndex}>{row.sendUnit || "-"}</DashboardListRowCell>,
      stockUnit: (columnIndex) => <DashboardListRowCell key="stockUnit" columnIndex={columnIndex}>{row.stockUnit || "-"}</DashboardListRowCell>,
      coverageAvailableUnit: (columnIndex) => <DashboardListRowCell key="coverageAvailableUnit" columnIndex={columnIndex}>{row.coverageAvailableUnit || "-"}</DashboardListRowCell>,
      itemCoverageUnit: (columnIndex) => <DashboardListRowCell key="itemCoverageUnit" columnIndex={columnIndex}>{row.itemCoverageUnit || "-"}</DashboardListRowCell>,
      serviceUnit: (columnIndex) => <DashboardListRowCell key="serviceUnit" columnIndex={columnIndex}>{row.serviceUnit || "-"}</DashboardListRowCell>,
    }

    return (
      <tr key={row.id} className="border-t border-[var(--panel-border)]">
        {renderDashboardRowCells(visibleColumns, cells)}
      </tr>
    )
  }

  return (
    <DashboardListPageTable minWidthClass="min-w-[1280px]" columns={visibleColumns}>
      {rows.map((row) => renderRow(row))}
      {rows.length === 0 ? <TableEmptyRow message="No categories found." colSpan={visibleColumns.length} /> : null}
    </DashboardListPageTable>
  )
}
