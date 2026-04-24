"use client"

import type { ReactNode } from "react"
import { DashboardListPageTable } from "@/modules/shared/engines/list-view/table/dashboard-list-page-table"
import { DashboardListRowCell } from "@/modules/shared/engines/list-view/table/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/modules/shared/engines/list-view/table/render-dashboard-row-cells"
import {
  ClickableTableRow,
  TableEmptyRow,
} from "@/modules/shared/engines/list-view/table/table-shell"
import type { GroupedRowTree } from "@/modules/shared/engines/list-view/controllers/use-table-controls"
import { renderGroupedTableRows } from "@/modules/shared/engines/list-view/table/render-grouped-table-rows"
import type { ManagementCompanyListRow } from "@builders/domain"

export function ManagementCompaniesTable({
  rows,
  visibleColumns,
  groupedRows,
  isGroupingEnabled,
  onOpen,
}: {
  rows: ManagementCompanyListRow[]
  visibleColumns: Array<{ key: string; label: string }>
  groupedRows: GroupedRowTree<ManagementCompanyListRow>[]
  isGroupingEnabled: boolean
  onOpen: (row: ManagementCompanyListRow) => void
}) {
  function renderRow(row: ManagementCompanyListRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      company: (columnIndex) => (
        <DashboardListRowCell key="company" columnIndex={columnIndex} className="font-medium text-blue-500">
          {row.name}
        </DashboardListRowCell>
      ),
      street: (columnIndex) => (
        <DashboardListRowCell key="street" columnIndex={columnIndex}>{row.streetAddress || "-"}</DashboardListRowCell>
      ),
      city: (columnIndex) => (
        <DashboardListRowCell key="city" columnIndex={columnIndex}>{row.city || "-"}</DashboardListRowCell>
      ),
      state: (columnIndex) => (
        <DashboardListRowCell key="state" columnIndex={columnIndex}>{row.state || "-"}</DashboardListRowCell>
      ),
      zip: (columnIndex) => (
        <DashboardListRowCell key="zip" columnIndex={columnIndex}>{row.zip || "-"}</DashboardListRowCell>
      ),
      phone: (columnIndex) => (
        <DashboardListRowCell key="phone" columnIndex={columnIndex}>{row.phone || "-"}</DashboardListRowCell>
      ),
      email: (columnIndex) => (
        <DashboardListRowCell key="email" columnIndex={columnIndex}>{row.email || "-"}</DashboardListRowCell>
      ),
      fullAddress: (columnIndex) => (
        <DashboardListRowCell key="fullAddress" columnIndex={columnIndex}>{row.fullAddress || "-"}</DashboardListRowCell>
      ),
      properties: (columnIndex) => (
        <DashboardListRowCell key="properties" columnIndex={columnIndex}>{row.propertyCount}</DashboardListRowCell>
      ),
    }

    return (
      <ClickableTableRow
        key={row.id}
        ariaLabel={`Edit management company ${row.name}`}
        onClick={() => onOpen(row)}
      >
        {renderDashboardRowCells(visibleColumns, cells)}
      </ClickableTableRow>
    )
  }

  return (
    <DashboardListPageTable minWidthClass="min-w-[1320px]" columns={visibleColumns}>
      {isGroupingEnabled
        ? renderGroupedTableRows({
            groups: groupedRows,
            colSpan: visibleColumns.length,
            renderRow,
          })
        : rows.map((row) => renderRow(row))}
      {rows.length === 0 ? <TableEmptyRow message="No management companies found." colSpan={visibleColumns.length} /> : null}
    </DashboardListPageTable>
  )
}
