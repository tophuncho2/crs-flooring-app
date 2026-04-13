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
import type { ManufacturerRow } from "@builders/domain"

export function ManufacturersTable({
  rows,
  visibleColumns,
  groupedRows,
  isGroupingEnabled,
  onOpen,
}: {
  rows: ManufacturerRow[]
  visibleColumns: Array<{ key: string; label: string }>
  groupedRows: GroupedRowTree<ManufacturerRow>[]
  isGroupingEnabled: boolean
  onOpen: (row: ManufacturerRow) => void
}) {
  function renderRow(row: ManufacturerRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      companyName: (columnIndex) => <DashboardListRowCell key="companyName" columnIndex={columnIndex} className="font-medium">{row.companyName || "No company"}</DashboardListRowCell>,
      agentName: (columnIndex) => <DashboardListRowCell key="agentName" columnIndex={columnIndex}>{row.agentName || "-"}</DashboardListRowCell>,
      website: (columnIndex) => <DashboardListRowCell key="website" columnIndex={columnIndex}>{row.website || "-"}</DashboardListRowCell>,
      phone: (columnIndex) => <DashboardListRowCell key="phone" columnIndex={columnIndex}>{row.phone || "-"}</DashboardListRowCell>,
      email: (columnIndex) => <DashboardListRowCell key="email" columnIndex={columnIndex}>{row.email || "-"}</DashboardListRowCell>,
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open manufacturer ${row.companyName || row.agentName || row.id}`} onClick={() => onOpen(row)}>
        {renderDashboardRowCells(visibleColumns, cells)}
      </ClickableTableRow>
    )
  }

  return (
    <DashboardListPageTable minWidthClass="min-w-[1100px]" columns={visibleColumns}>
      {isGroupingEnabled
        ? renderGroupedTableRows({
            groups: groupedRows,
            colSpan: visibleColumns.length,
            renderRow,
          })
        : rows.map((row) => renderRow(row))}
      {rows.length === 0 ? <TableEmptyRow message="No manufacturers found." colSpan={visibleColumns.length} /> : null}
    </DashboardListPageTable>
  )
}
