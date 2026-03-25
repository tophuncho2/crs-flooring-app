"use client"

import type { ReactNode } from "react"
import { DeleteRowButton } from "@/features/flooring/shared/table/row-action-buttons"
import { ClickableTableRow, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TableShell } from "@/features/flooring/shared/table/table-shell"
import type { GroupedRowTree } from "@/features/flooring/shared/table/use-table-controls"
import type { ServiceRow } from "../../domain/types"

export function ServicesTable({
  rows,
  visibleColumns,
  groupedRows,
  isGroupingEnabled,
  deletingId,
  onOpen,
  onDelete,
}: {
  rows: ServiceRow[]
  visibleColumns: Array<{ key: string; label: string }>
  groupedRows: GroupedRowTree<ServiceRow>[]
  isGroupingEnabled: boolean
  deletingId: string | null
  onOpen: (row: ServiceRow) => void
  onDelete: (row: ServiceRow) => void
}) {
  function renderRow(row: ServiceRow) {
    const cells: Record<string, ReactNode> = {
      name: <td key="name" className="px-3 py-2 font-medium">{row.name}</td>,
      unit: <td key="unit" className="px-3 py-2">{row.unitName}</td>,
      cost: <td key="cost" className="px-3 py-2">{row.baseCost}</td>,
      notes: <td key="notes" className="px-3 py-2">{row.notes || "-"}</td>,
      usage: <td key="usage" className="px-3 py-2">{row.usageCount}</td>,
      delete: (
        <td key="delete" className="px-3 py-2">
          <DeleteRowButton onClick={() => onDelete(row)} disabled={deletingId === row.id}>
            {deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </td>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open service ${row.name}`} onClick={() => onOpen(row)}>
        {visibleColumns.map((column) => cells[column.key])}
      </ClickableTableRow>
    )
  }

  function renderGroupedRows(groups: GroupedRowTree<ServiceRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow key={`${group.depth}-${group.key}`} label={`${group.fieldLabel}: ${group.label}`} depth={group.depth} colSpan={visibleColumns.length} />,
      ...(group.children.length > 0 ? renderGroupedRows(group.children) : group.rows.map((row) => renderRow(row))),
    ])
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
        {isGroupingEnabled ? renderGroupedRows(groupedRows) : rows.map((row) => renderRow(row))}
        {rows.length === 0 ? <TableEmptyRow message="No services found." colSpan={visibleColumns.length} /> : null}
      </tbody>
    </TableShell>
  )
}
