"use client"

import type { ReactNode } from "react"
import { renderGroupedTableRows } from "@/features/flooring/shared/ui/table/render-grouped-table-rows"
import {
  ClickableTableRow,
  DashboardTableCell,
  EmbeddedPageTableShell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
} from "@/features/flooring/shared/ui/table/table-shell"
import type { GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import type { WarehouseRow } from "../types"

export function WarehouseTable({
  rows,
  visibleColumns,
  groupedRows,
  isGroupingEnabled,
  onOpen,
}: {
  rows: WarehouseRow[]
  visibleColumns: Array<{ key: string; label: string }>
  groupedRows: GroupedRowTree<WarehouseRow>[]
  isGroupingEnabled: boolean
  onOpen: (row: WarehouseRow) => void
}) {
  function renderRow(row: WarehouseRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      name: (columnIndex) => (
        <DashboardTableCell key="name" columnIndex={columnIndex} className="font-medium text-blue-500">
          {row.name}
        </DashboardTableCell>
      ),
      address: (columnIndex) => <DashboardTableCell key="address" columnIndex={columnIndex}>{row.address || "-"}</DashboardTableCell>,
      phone: (columnIndex) => <DashboardTableCell key="phone" columnIndex={columnIndex}>{row.phone || "-"}</DashboardTableCell>,
      sections: (columnIndex) => <DashboardTableCell key="sections" columnIndex={columnIndex}>{row.sectionsCount}</DashboardTableCell>,
      locations: (columnIndex) => <DashboardTableCell key="locations" columnIndex={columnIndex}>{row.locationsCount}</DashboardTableCell>,
      workOrders: (columnIndex) => <DashboardTableCell key="workOrders" columnIndex={columnIndex}>{row.workOrdersCount}</DashboardTableCell>,
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open warehouse ${row.name}`} onClick={() => onOpen(row)}>
        {visibleColumns.map((column, columnIndex) => cells[column.key](columnIndex))}
      </ClickableTableRow>
    )
  }

  return (
    <EmbeddedPageTableShell minWidthClass="min-w-[980px]">
      <TableHead>
        <tr>
          {visibleColumns.map((column) => (
            <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
          ))}
        </tr>
      </TableHead>
      <tbody>
        {isGroupingEnabled
          ? renderGroupedTableRows({
              groups: groupedRows,
              colSpan: visibleColumns.length,
              renderRow,
            })
          : rows.map((row) => renderRow(row))}
        {rows.length === 0 ? <TableEmptyRow message="No warehouses found." colSpan={visibleColumns.length} /> : null}
      </tbody>
    </EmbeddedPageTableShell>
  )
}
