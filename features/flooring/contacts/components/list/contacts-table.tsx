"use client"

import type { ReactNode } from "react"
import { DeleteRowButton } from "@/features/flooring/shared/ui/table/row-action-buttons"
import { ClickableTableRow, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TableShell } from "@/features/flooring/shared/ui/table/table-shell"
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
    const cells: Record<string, ReactNode> = {
      name: <td key="name" className="px-3 py-2 font-medium">{row.name}</td>,
      type: <td key="type" className="px-3 py-2">{row.typeLabel}</td>,
      assignments: <td key="assignments" className="px-3 py-2">{row.assignmentsCount}</td>,
      delete: (
        <td key="delete" className="px-3 py-2">
          <DeleteRowButton onClick={() => onDelete(row)} disabled={deletingId === row.id}>
            {deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </td>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open contact ${row.name}`} onClick={() => onOpen(row)}>
        {visibleColumns.map((column) => cells[column.key])}
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
    <TableShell minWidthClass="min-w-[860px]">
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
    </TableShell>
  )
}
