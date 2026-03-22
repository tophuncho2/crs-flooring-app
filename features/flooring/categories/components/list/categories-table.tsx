"use client"

import type { ReactNode } from "react"
import { DeleteRowButton } from "@/features/flooring/shared/table/row-action-buttons"
import { ClickableTableRow, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TableShell } from "@/features/flooring/shared/table/table-shell"
import type { GroupedRowTree } from "@/features/flooring/shared/table/use-table-controls"
import type { CategoryRow } from "../../domain/types"

export function CategoriesTable({
  rows,
  visibleColumns,
  groupedRows,
  isGroupingEnabled,
  canManage,
  deletingId,
  onOpen,
  onDelete,
}: {
  rows: CategoryRow[]
  visibleColumns: Array<{ key: string; label: string }>
  groupedRows: GroupedRowTree<CategoryRow>[]
  isGroupingEnabled: boolean
  canManage: boolean
  deletingId: string | null
  onOpen: (row: CategoryRow) => void
  onDelete: (row: CategoryRow) => void
}) {
  function renderRow(row: CategoryRow) {
    const cells: Record<string, ReactNode> = {
      name: <td key="name" className="px-3 py-2 font-medium">{row.name}</td>,
      sendUnit: <td key="sendUnit" className="px-3 py-2">{row.sendUnit || "-"}</td>,
      stockUnit: <td key="stockUnit" className="px-3 py-2">{row.stockUnit || "-"}</td>,
      coverageAvailableUnit: <td key="coverageAvailableUnit" className="px-3 py-2">{row.coverageAvailableUnit || "-"}</td>,
      itemCoverageUnit: <td key="itemCoverageUnit" className="px-3 py-2">{row.itemCoverageUnit || "-"}</td>,
      serviceUnit: <td key="serviceUnit" className="px-3 py-2">{row.serviceUnit || "-"}</td>,
      products: <td key="products" className="px-3 py-2">{row.productCount}</td>,
      ...(canManage
        ? {
            delete: (
              <td key="delete" className="px-3 py-2">
                <DeleteRowButton onClick={() => onDelete(row)} disabled={deletingId === row.id}>
                  {deletingId === row.id ? "Deleting..." : "Delete"}
                </DeleteRowButton>
              </td>
            ),
          }
        : {}),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open category ${row.name}`} onClick={() => onOpen(row)}>
        {visibleColumns.map((column) => cells[column.key])}
      </ClickableTableRow>
    )
  }

  function renderGroupedRows(groups: GroupedRowTree<CategoryRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow key={`${group.depth}-${group.key}`} label={`${group.fieldLabel}: ${group.label}`} depth={group.depth} colSpan={visibleColumns.length} />,
      ...(group.children.length > 0 ? renderGroupedRows(group.children) : group.rows.map((row) => renderRow(row))),
    ])
  }

  return (
    <TableShell minWidthClass="min-w-[1280px]">
      <TableHead>
        <tr>
          {visibleColumns.map((column) => (
            <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
          ))}
        </tr>
      </TableHead>
      <tbody>
        {isGroupingEnabled ? renderGroupedRows(groupedRows) : rows.map((row) => renderRow(row))}
        {rows.length === 0 ? <TableEmptyRow message="No categories found." colSpan={visibleColumns.length} /> : null}
      </tbody>
    </TableShell>
  )
}
