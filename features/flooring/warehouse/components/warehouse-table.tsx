"use client"

import type { ReactNode } from "react"
import { renderGroupedTableRows } from "@/features/flooring/shared/ui/table/render-grouped-table-rows"
import { ClickableTableRow, TableEmptyRow, TableHead, TableHeaderCell, TableShell } from "@/features/flooring/shared/ui/table/table-shell"
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
    const cells: Record<string, ReactNode> = {
      name: <td key="name" className="px-3 py-2 font-medium text-blue-500">{row.name}</td>,
      address: <td key="address" className="px-3 py-2">{row.address || "-"}</td>,
      phone: <td key="phone" className="px-3 py-2">{row.phone || "-"}</td>,
      sections: <td key="sections" className="px-3 py-2">{row.sectionsCount}</td>,
      locations: <td key="locations" className="px-3 py-2">{row.locationsCount}</td>,
      workOrders: <td key="workOrders" className="px-3 py-2">{row.workOrdersCount}</td>,
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open warehouse ${row.name}`} onClick={() => onOpen(row)}>
        {visibleColumns.map((column) => cells[column.key])}
      </ClickableTableRow>
    )
  }

  return (
    <TableShell minWidthClass="min-w-[980px]">
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
    </TableShell>
  )
}
