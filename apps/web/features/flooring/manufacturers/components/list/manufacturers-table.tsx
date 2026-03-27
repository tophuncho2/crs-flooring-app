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
import type { ManufacturerRow } from "../../domain/types"

export function ManufacturersTable({
  rows,
  visibleColumns,
  groupedRows,
  isGroupingEnabled,
  deletingId,
  onOpen,
  onDelete,
}: {
  rows: ManufacturerRow[]
  visibleColumns: Array<{ key: string; label: string }>
  groupedRows: GroupedRowTree<ManufacturerRow>[]
  isGroupingEnabled: boolean
  deletingId: string | null
  onOpen: (row: ManufacturerRow) => void
  onDelete: (row: ManufacturerRow) => void
}) {
  function renderRow(row: ManufacturerRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      companyName: (columnIndex) => <DashboardTableCell key="companyName" columnIndex={columnIndex} className="font-medium">{row.companyName || "No company"}</DashboardTableCell>,
      agentName: (columnIndex) => <DashboardTableCell key="agentName" columnIndex={columnIndex}>{row.agentName || "-"}</DashboardTableCell>,
      website: (columnIndex) => <DashboardTableCell key="website" columnIndex={columnIndex}>{row.website || "-"}</DashboardTableCell>,
      phone: (columnIndex) => <DashboardTableCell key="phone" columnIndex={columnIndex}>{row.phone || "-"}</DashboardTableCell>,
      email: (columnIndex) => <DashboardTableCell key="email" columnIndex={columnIndex}>{row.email || "-"}</DashboardTableCell>,
      products: (columnIndex) => <DashboardTableCell key="products" columnIndex={columnIndex}>{row.productsCount}</DashboardTableCell>,
      delete: (columnIndex) => (
        <DashboardTableCell key="delete" columnIndex={columnIndex}>
          <DeleteRowButton onClick={() => onDelete(row)} disabled={deletingId === row.id}>
            {deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </DashboardTableCell>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open manufacturer ${row.companyName || row.agentName || row.id}`} onClick={() => onOpen(row)}>
        {visibleColumns.map((column, columnIndex) => cells[column.key](columnIndex))}
      </ClickableTableRow>
    )
  }

  function renderGroupedRows(groups: GroupedRowTree<ManufacturerRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow key={`${group.depth}-${group.key}`} label={`${group.fieldLabel}: ${group.label}`} depth={group.depth} colSpan={visibleColumns.length} />,
      ...(group.children.length > 0 ? renderGroupedRows(group.children) : group.rows.map((row) => renderRow(row))),
    ])
  }

  return (
    <EmbeddedPageTableShell minWidthClass="min-w-[1100px]">
      <TableHead>
        <tr>
          {visibleColumns.map((column) => (
            <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
          ))}
        </tr>
      </TableHead>
      <tbody>
        {isGroupingEnabled ? renderGroupedRows(groupedRows) : rows.map((row) => renderRow(row))}
        {rows.length === 0 ? <TableEmptyRow message="No manufacturers found." colSpan={visibleColumns.length} /> : null}
      </tbody>
    </EmbeddedPageTableShell>
  )
}
