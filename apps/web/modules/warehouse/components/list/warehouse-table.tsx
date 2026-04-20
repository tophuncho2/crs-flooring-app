"use client"

import type { ReactNode } from "react"
import { DashboardListPageTable } from "@/modules/shared/engines/list-view/table/dashboard-list-page-table"
import { DashboardListRowCell } from "@/modules/shared/engines/list-view/table/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/modules/shared/engines/list-view/table/render-dashboard-row-cells"
import { renderGroupedTableRows } from "@/modules/shared/engines/list-view/table/render-grouped-table-rows"
import {
  ClickableTableRow,
  TableEmptyRow,
} from "@/modules/shared/engines/list-view/table/table-shell"
import type { GroupedRowTree } from "@/modules/shared/engines/list-view/controllers/use-table-controls"
import type { WarehouseRow } from "@/modules/warehouse/types"

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
        <DashboardListRowCell key="name" columnIndex={columnIndex} className="font-medium text-blue-500">
          {row.name}
        </DashboardListRowCell>
      ),
      address: (columnIndex) => <DashboardListRowCell key="address" columnIndex={columnIndex}>{row.address || "-"}</DashboardListRowCell>,
      phone: (columnIndex) => <DashboardListRowCell key="phone" columnIndex={columnIndex}>{row.phone || "-"}</DashboardListRowCell>,
      sections: (columnIndex) => <DashboardListRowCell key="sections" columnIndex={columnIndex}>{row.sectionsCount}</DashboardListRowCell>,
      locations: (columnIndex) => <DashboardListRowCell key="locations" columnIndex={columnIndex}>{row.locationsCount}</DashboardListRowCell>,
      workOrders: (columnIndex) => <DashboardListRowCell key="workOrders" columnIndex={columnIndex}>{row.workOrdersCount}</DashboardListRowCell>,
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open warehouse ${row.name}`} onClick={() => onOpen(row)}>
        {renderDashboardRowCells(visibleColumns, cells)}
      </ClickableTableRow>
    )
  }

  return (
    <DashboardListPageTable minWidthClass="min-w-[980px]" columns={visibleColumns}>
      {isGroupingEnabled
        ? renderGroupedTableRows({
            groups: groupedRows,
            colSpan: visibleColumns.length,
            renderRow,
          })
        : rows.map((row) => renderRow(row))}
      {rows.length === 0 ? <TableEmptyRow message="No warehouses found." colSpan={visibleColumns.length} /> : null}
    </DashboardListPageTable>
  )
}
