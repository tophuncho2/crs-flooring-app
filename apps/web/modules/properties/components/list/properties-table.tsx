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
import type { PropertyListRow } from "@builders/domain"

export function PropertiesTable({
  rows,
  visibleColumns,
  groupedRows,
  isGroupingEnabled,
  onOpen,
}: {
  rows: PropertyListRow[]
  visibleColumns: Array<{ key: string; label: string }>
  groupedRows: GroupedRowTree<PropertyListRow>[]
  isGroupingEnabled: boolean
  onOpen: (row: PropertyListRow) => void
}) {
  function renderRow(row: PropertyListRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      managementCompany: (columnIndex) => (
        <DashboardListRowCell key="managementCompany" columnIndex={columnIndex}>
          {row.managementCompany?.name || "-"}
        </DashboardListRowCell>
      ),
      name: (columnIndex) => (
        <DashboardListRowCell key="name" columnIndex={columnIndex} className="font-medium text-blue-500">
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
      templates: (columnIndex) => (
        <DashboardListRowCell key="templates" columnIndex={columnIndex}>{row.templateCount}</DashboardListRowCell>
      ),
    }

    return (
      <ClickableTableRow
        key={row.id}
        ariaLabel={`Open property ${row.name}`}
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
      {rows.length === 0 ? <TableEmptyRow message="No properties found." colSpan={visibleColumns.length} /> : null}
    </DashboardListPageTable>
  )
}
