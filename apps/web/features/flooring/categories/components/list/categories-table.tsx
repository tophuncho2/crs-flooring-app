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
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      name: (columnIndex) => <DashboardTableCell key="name" columnIndex={columnIndex} className="font-medium">{row.name}</DashboardTableCell>,
      sendUnit: (columnIndex) => <DashboardTableCell key="sendUnit" columnIndex={columnIndex}>{row.sendUnit || "-"}</DashboardTableCell>,
      stockUnit: (columnIndex) => <DashboardTableCell key="stockUnit" columnIndex={columnIndex}>{row.stockUnit || "-"}</DashboardTableCell>,
      coverageAvailableUnit: (columnIndex) => <DashboardTableCell key="coverageAvailableUnit" columnIndex={columnIndex}>{row.coverageAvailableUnit || "-"}</DashboardTableCell>,
      itemCoverageUnit: (columnIndex) => <DashboardTableCell key="itemCoverageUnit" columnIndex={columnIndex}>{row.itemCoverageUnit || "-"}</DashboardTableCell>,
      serviceUnit: (columnIndex) => <DashboardTableCell key="serviceUnit" columnIndex={columnIndex}>{row.serviceUnit || "-"}</DashboardTableCell>,
      products: (columnIndex) => <DashboardTableCell key="products" columnIndex={columnIndex}>{row.productCount}</DashboardTableCell>,
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
      <ClickableTableRow key={row.id} ariaLabel={`Open category ${row.name}`} onClick={() => onOpen(row)}>
        {visibleColumns.map((column, columnIndex) => cells[column.key](columnIndex))}
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
    <EmbeddedPageTableShell minWidthClass="min-w-[1280px]">
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
    </EmbeddedPageTableShell>
  )
}
