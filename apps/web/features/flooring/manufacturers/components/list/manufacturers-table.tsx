"use client"

import type { ReactNode } from "react"
import { DeleteRowButton } from "@/features/flooring/shared/table/row-action-buttons"
import { ClickableTableRow, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TableShell } from "@/features/flooring/shared/table/table-shell"
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
    const cells: Record<string, ReactNode> = {
      companyName: <td key="companyName" className="px-3 py-2 font-medium">{row.companyName || "No company"}</td>,
      agentName: <td key="agentName" className="px-3 py-2">{row.agentName || "-"}</td>,
      website: <td key="website" className="px-3 py-2">{row.website || "-"}</td>,
      phone: <td key="phone" className="px-3 py-2">{row.phone || "-"}</td>,
      email: <td key="email" className="px-3 py-2">{row.email || "-"}</td>,
      products: <td key="products" className="px-3 py-2">{row.productsCount}</td>,
      delete: (
        <td key="delete" className="px-3 py-2">
          <DeleteRowButton onClick={() => onDelete(row)} disabled={deletingId === row.id}>
            {deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </td>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open manufacturer ${row.companyName || row.agentName || row.id}`} onClick={() => onOpen(row)}>
        {visibleColumns.map((column) => cells[column.key])}
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
    <TableShell minWidthClass="min-w-[1100px]">
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
    </TableShell>
  )
}
