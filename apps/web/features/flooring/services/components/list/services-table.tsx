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
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      name: (columnIndex) => <DashboardTableCell key="name" columnIndex={columnIndex} className="font-medium">{row.name}</DashboardTableCell>,
      unit: (columnIndex) => <DashboardTableCell key="unit" columnIndex={columnIndex}>{row.unitName}</DashboardTableCell>,
      cost: (columnIndex) => <DashboardTableCell key="cost" columnIndex={columnIndex}>{row.baseCost}</DashboardTableCell>,
      notes: (columnIndex) => <DashboardTableCell key="notes" columnIndex={columnIndex}>{row.notes || "-"}</DashboardTableCell>,
      usage: (columnIndex) => <DashboardTableCell key="usage" columnIndex={columnIndex}>{row.usageCount}</DashboardTableCell>,
      delete: (columnIndex) => (
        <DashboardTableCell key="delete" columnIndex={columnIndex}>
          <DeleteRowButton onClick={() => onDelete(row)} disabled={deletingId === row.id}>
            {deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </DashboardTableCell>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open service ${row.name}`} onClick={() => onOpen(row)}>
        {visibleColumns.map((column, columnIndex) => cells[column.key](columnIndex))}
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
    <EmbeddedPageTableShell minWidthClass="min-w-[980px]">
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
    </EmbeddedPageTableShell>
  )
}
