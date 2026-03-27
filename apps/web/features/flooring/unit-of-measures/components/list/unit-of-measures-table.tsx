"use client"

import type { ReactNode } from "react"
import { DeleteRowButton } from "@/features/flooring/shared/table/row-action-buttons"
import {
  ClickableTableRow,
  DashboardTableCell,
  EmbeddedPageTableShell,
  TableEmptyRow,
  TableGroupRow,
  TableHead,
  TableHeaderCell,
} from "@/features/flooring/shared/table/table-shell"
import type { GroupedRowTree } from "@/features/flooring/shared/table/use-table-controls"
import { formatStableDateTime } from "@/features/flooring/shared/utils/date-format"
import type { UnitOfMeasureRow } from "../../domain/types"

export function UnitOfMeasuresTable({
  rows,
  visibleColumns,
  groupedRows,
  isGroupingEnabled,
  canManage,
  deletingId,
  onOpen,
  onDelete,
}: {
  rows: UnitOfMeasureRow[]
  visibleColumns: Array<{ key: string; label: string }>
  groupedRows: GroupedRowTree<UnitOfMeasureRow>[]
  isGroupingEnabled: boolean
  canManage: boolean
  deletingId: string | null
  onOpen: (row: UnitOfMeasureRow) => void
  onDelete: (row: UnitOfMeasureRow) => void
}) {
  function renderRow(row: UnitOfMeasureRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      name: (columnIndex) => <DashboardTableCell key="name" columnIndex={columnIndex} className="font-medium">{row.name}</DashboardTableCell>,
      createdAt: (columnIndex) => <DashboardTableCell key="createdAt" columnIndex={columnIndex}>{formatStableDateTime(row.createdAt)}</DashboardTableCell>,
      ...(canManage
        ? {
            delete: (columnIndex: number) => (
              <DashboardTableCell key="delete" columnIndex={columnIndex}>
                <DeleteRowButton onClick={() => onDelete(row)} disabled={deletingId === row.id}>
                  {deletingId === row.id ? "Deleting..." : "Delete"}
                </DeleteRowButton>
              </DashboardTableCell>
            ),
          }
        : {}),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open unit of measure ${row.name}`} onClick={() => onOpen(row)}>
        {visibleColumns.map((column, columnIndex) => cells[column.key](columnIndex))}
      </ClickableTableRow>
    )
  }

  function renderGroupedRows(groups: GroupedRowTree<UnitOfMeasureRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow
        key={`${group.depth}-${group.key}`}
        label={`${group.fieldLabel}: ${group.label}`}
        depth={group.depth}
        colSpan={visibleColumns.length}
      />,
      ...(group.children.length > 0 ? renderGroupedRows(group.children) : group.rows.map((row) => renderRow(row))),
    ])
  }

  return (
    <EmbeddedPageTableShell minWidthClass="min-w-[780px]">
      <TableHead>
        <tr>
          {visibleColumns.map((column) => (
            <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
          ))}
        </tr>
      </TableHead>
      <tbody>
        {isGroupingEnabled ? renderGroupedRows(groupedRows) : rows.map((row) => renderRow(row))}
        {rows.length === 0 ? <TableEmptyRow message="No units of measure found." colSpan={visibleColumns.length} /> : null}
      </tbody>
    </EmbeddedPageTableShell>
  )
}
