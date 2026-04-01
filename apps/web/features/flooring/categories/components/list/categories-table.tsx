"use client"

import type { ReactNode } from "react"
import { DashboardListPageTable } from "@/features/dashboard/shared/list-page/dashboard-list-page-table"
import { DashboardListRowCell } from "@/features/dashboard/shared/list-page/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/features/dashboard/shared/list-page/render-dashboard-row-cells"
import {
  ClickableTableRow,
  TableEmptyRow,
} from "@/features/dashboard/shared/table/table-shell"
import { renderGroupedTableRows } from "@/features/dashboard/shared/table/render-grouped-table-rows"
import type { GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import type { CategoryRow } from "../../domain/types"

export function CategoriesTable({
  rows,
  visibleColumns,
  groupedRows,
  isGroupingEnabled,
  onOpen,
}: {
  rows: CategoryRow[]
  visibleColumns: Array<{ key: string; label: string }>
  groupedRows: GroupedRowTree<CategoryRow>[]
  isGroupingEnabled: boolean
  onOpen: (row: CategoryRow) => void
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
      <ClickableTableRow key={row.id} ariaLabel={`Open category ${row.name}`} onClick={() => onOpen(row)}>
        {renderDashboardRowCells(visibleColumns, cells)}
      </ClickableTableRow>
    )
  }

  return (
    <DashboardListPageTable minWidthClass="min-w-[1280px]" columns={visibleColumns}>
      {isGroupingEnabled
        ? renderGroupedTableRows({
            groups: groupedRows,
            colSpan: visibleColumns.length,
            renderRow,
          })
        : rows.map((row) => renderRow(row))}
      {rows.length === 0 ? <TableEmptyRow message="No categories found." colSpan={visibleColumns.length} /> : null}
    </DashboardListPageTable>
  )
}
