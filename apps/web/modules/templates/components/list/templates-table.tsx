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
import type { TemplateListRow } from "@builders/domain"

export function TemplatesTable({
  rows,
  visibleColumns,
  groupedRows,
  isGroupingEnabled,
  onOpen,
}: {
  rows: TemplateListRow[]
  visibleColumns: Array<{ key: string; label: string }>
  groupedRows: GroupedRowTree<TemplateListRow>[]
  isGroupingEnabled: boolean
  onOpen: (row: TemplateListRow) => void
}) {
  function renderRow(row: TemplateListRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      templateNumber: (columnIndex) => (
        <DashboardListRowCell key="templateNumber" columnIndex={columnIndex} className="font-medium text-blue-500">
          {row.templateNumber}
        </DashboardListRowCell>
      ),
      unitType: (columnIndex) => (
        <DashboardListRowCell key="unitType" columnIndex={columnIndex}>{row.unitType || "-"}</DashboardListRowCell>
      ),
      property: (columnIndex) => (
        <DashboardListRowCell key="property" columnIndex={columnIndex}>{row.propertyName || "-"}</DashboardListRowCell>
      ),
      managementCompany: (columnIndex) => (
        <DashboardListRowCell key="managementCompany" columnIndex={columnIndex}>
          {row.managementCompanyName || "-"}
        </DashboardListRowCell>
      ),
      jobType: (columnIndex) => (
        <DashboardListRowCell key="jobType" columnIndex={columnIndex}>{row.jobTypeName || "-"}</DashboardListRowCell>
      ),
      warehouse: (columnIndex) => (
        <DashboardListRowCell key="warehouse" columnIndex={columnIndex}>{row.warehouseName || "-"}</DashboardListRowCell>
      ),
      description: (columnIndex) => (
        <DashboardListRowCell key="description" columnIndex={columnIndex}>{row.description || "-"}</DashboardListRowCell>
      ),
      items: (columnIndex) => (
        <DashboardListRowCell key="items" columnIndex={columnIndex}>{row.itemsCount}</DashboardListRowCell>
      ),
    }

    return (
      <ClickableTableRow
        key={row.id}
        ariaLabel={`Open template ${row.templateNumber}`}
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
      {rows.length === 0 ? <TableEmptyRow message="No templates found." colSpan={visibleColumns.length} /> : null}
    </DashboardListPageTable>
  )
}
