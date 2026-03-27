"use client"

import type { ReactNode } from "react"
import { DashboardListPageTable } from "@/features/dashboard/shared/list-page/dashboard-list-page-table"
import { DashboardListRowCell } from "@/features/dashboard/shared/list-page/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/features/dashboard/shared/list-page/render-dashboard-row-cells"
import { DeleteRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import {
  ClickableTableRow,
  TableEmptyRow,
} from "@/features/dashboard/shared/table/table-shell"
import type { GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import { renderGroupedTableRows } from "@/features/dashboard/shared/table/render-grouped-table-rows"
import type { ContactRow } from "../../domain/types"

export function ContactsTable({
  rows,
  visibleColumns,
  groupedRows,
  isGroupingEnabled,
  deletingId,
  onOpen,
  onDelete,
}: {
  rows: ContactRow[]
  visibleColumns: Array<{ key: string; label: string }>
  groupedRows: GroupedRowTree<ContactRow>[]
  isGroupingEnabled: boolean
  deletingId: string | null
  onOpen: (row: ContactRow) => void
  onDelete: (row: ContactRow) => void
}) {
  function renderRow(row: ContactRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      name: (columnIndex) => <DashboardListRowCell key="name" columnIndex={columnIndex} className="font-medium">{row.name}</DashboardListRowCell>,
      type: (columnIndex) => <DashboardListRowCell key="type" columnIndex={columnIndex}>{row.typeLabel}</DashboardListRowCell>,
      assignments: (columnIndex) => <DashboardListRowCell key="assignments" columnIndex={columnIndex}>{row.assignmentsCount}</DashboardListRowCell>,
      delete: (columnIndex) => (
        <DashboardListRowCell key="delete" columnIndex={columnIndex}>
          <DeleteRowButton onClick={() => onDelete(row)} disabled={deletingId === row.id}>
            {deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </DashboardListRowCell>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open contact ${row.name}`} onClick={() => onOpen(row)}>
        {renderDashboardRowCells(visibleColumns, cells)}
      </ClickableTableRow>
    )
  }

  return (
    <DashboardListPageTable minWidthClass="min-w-[860px]" columns={visibleColumns}>
      {isGroupingEnabled
        ? renderGroupedTableRows({
            groups: groupedRows,
            colSpan: visibleColumns.length,
            renderRow,
          })
        : rows.map((row) => renderRow(row))}
      {rows.length === 0 ? <TableEmptyRow message="No contacts found." colSpan={visibleColumns.length} /> : null}
    </DashboardListPageTable>
  )
}
