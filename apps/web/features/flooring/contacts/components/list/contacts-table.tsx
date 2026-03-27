"use client"

import type { ReactNode } from "react"
import { DeleteRowButton } from "@/features/flooring/shared/ui/table/row-action-buttons"
import {
  ClickableTableRow,
  DashboardTableCell,
  EmbeddedPageTableShell,
  TableEmptyRow,
  TableGroupRow,
  TableHead,
  TableHeaderCell,
} from "@/features/flooring/shared/ui/table/table-shell"
import type { GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
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
      name: (columnIndex) => <DashboardTableCell key="name" columnIndex={columnIndex} className="font-medium">{row.name}</DashboardTableCell>,
      type: (columnIndex) => <DashboardTableCell key="type" columnIndex={columnIndex}>{row.typeLabel}</DashboardTableCell>,
      assignments: (columnIndex) => <DashboardTableCell key="assignments" columnIndex={columnIndex}>{row.assignmentsCount}</DashboardTableCell>,
      delete: (columnIndex) => (
        <DashboardTableCell key="delete" columnIndex={columnIndex}>
          <DeleteRowButton onClick={() => onDelete(row)} disabled={deletingId === row.id}>
            {deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </DashboardTableCell>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open contact ${row.name}`} onClick={() => onOpen(row)}>
        {visibleColumns.map((column, columnIndex) => cells[column.key](columnIndex))}
      </ClickableTableRow>
    )
  }

  function renderGroupedRows(groups: GroupedRowTree<ContactRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow key={`${group.depth}-${group.key}`} label={`${group.fieldLabel}: ${group.label}`} depth={group.depth} colSpan={visibleColumns.length} />,
      ...(group.children.length > 0 ? renderGroupedRows(group.children) : group.rows.map((row) => renderRow(row))),
    ])
  }

  return (
    <EmbeddedPageTableShell minWidthClass="min-w-[860px]">
      <TableHead>
        <tr>
          {visibleColumns.map((column) => (
            <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
          ))}
        </tr>
      </TableHead>
      <tbody>
        {isGroupingEnabled ? renderGroupedRows(groupedRows) : rows.map((row) => renderRow(row))}
        {rows.length === 0 ? <TableEmptyRow message="No contacts found." colSpan={visibleColumns.length} /> : null}
      </tbody>
    </EmbeddedPageTableShell>
  )
}
