"use client"

import type { ReactNode } from "react"
import { formatStableDate } from "@/features/flooring/shared/domain/date-format"
import { StatusPill } from "@/features/flooring/shared/ui/feedback/status-pill"
import { DeleteRowButton } from "@/features/flooring/shared/ui/table/row-action-buttons"
import {
  ClickableTableRow,
  DashboardTableCell,
  EmbeddedPageTableShell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TablePaginationControls,
} from "@/features/flooring/shared/ui/table/table-shell"
import type { GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import { renderGroupedTableRows } from "@/features/flooring/shared/ui/table/render-grouped-table-rows"
import type { ImportRow } from "@/features/flooring/imports/controllers/use-imports-list-controller"
import {
  formatImportStatus,
  formatTransportType,
  getImportStatusFieldClass,
  getTransportTypeFieldClass,
} from "@/features/flooring/imports/contracts"

export function ImportsTable({
  rows,
  groupedRows,
  isGroupingEnabled,
  visibleColumnKeys,
  visibleColumns,
  pagination,
  page,
  totalPages,
  pageSize,
  totalItems,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  deletingImportId,
  onDeleteImport,
  onOpenImport,
}: {
  rows: ImportRow[]
  groupedRows: GroupedRowTree<ImportRow>[]
  isGroupingEnabled: boolean
  visibleColumnKeys: string[]
  visibleColumns: Array<{ key: string; label: string }>
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    previousPageHref: string
    nextPageHref: string
  }
  page: number
  totalPages: number
  pageSize: number
  totalItems: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  deletingImportId: string | null
  onDeleteImport: (id: string) => void
  onOpenImport: (id: string) => void
}) {
  function renderRow(row: ImportRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      importNumber: (columnIndex) => (
        <DashboardTableCell key="importNumber" columnIndex={columnIndex} className="font-medium text-blue-500">
          IMP-{String(row.importNumber).padStart(4, "0")}
        </DashboardTableCell>
      ),
      tag: (columnIndex) => <DashboardTableCell key="tag" columnIndex={columnIndex}>{row.tag || "-"}</DashboardTableCell>,
      transport: (columnIndex) => (
        <DashboardTableCell key="transport" columnIndex={columnIndex}>
          <StatusPill label={formatTransportType(row.transportType)} toneClassName={getTransportTypeFieldClass(row.transportType)} />
        </DashboardTableCell>
      ),
      status: (columnIndex) => (
        <DashboardTableCell key="status" columnIndex={columnIndex}>
          <StatusPill label={formatImportStatus(row.status)} toneClassName={getImportStatusFieldClass(row.status)} />
        </DashboardTableCell>
      ),
      warehouse: (columnIndex) => <DashboardTableCell key="warehouse" columnIndex={columnIndex}>{row.warehouseName || "-"}</DashboardTableCell>,
      created: (columnIndex) => <DashboardTableCell key="created" columnIndex={columnIndex}>{formatStableDate(row.createdAt)}</DashboardTableCell>,
      items: (columnIndex) => <DashboardTableCell key="items" columnIndex={columnIndex}>{row.itemsCount}</DashboardTableCell>,
      delete: (columnIndex) => (
        <DashboardTableCell key="delete" columnIndex={columnIndex}>
          <DeleteRowButton
            onClick={() => onDeleteImport(row.id)}
            disabled={deletingImportId === row.id}
          >
            {deletingImportId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </DashboardTableCell>
      ),
    }

    return (
      <ClickableTableRow
        key={row.id}
        ariaLabel={`Open import ${String(row.importNumber).padStart(4, "0")}`}
        onClick={() => onOpenImport(row.id)}
      >
        {visibleColumnKeys.map((columnKey, columnIndex) => cells[columnKey](columnIndex))}
      </ClickableTableRow>
    )
  }

  return (
    <>
      <EmbeddedPageTableShell minWidthClass="min-w-[980px]">
        <TableHead>
          <tr>
            {visibleColumns.map((column) => (
              <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
            ))}
          </tr>
        </TableHead>
        <tbody>
          {isGroupingEnabled
            ? renderGroupedTableRows({
                groups: groupedRows,
                colSpan: visibleColumnKeys.length,
                renderRow,
              })
            : rows.map((row) => renderRow(row))}
          {rows.length === 0 ? <TableEmptyRow message="No imports logged yet." colSpan={visibleColumnKeys.length} /> : null}
        </tbody>
      </EmbeddedPageTableShell>
      <TablePaginationControls
        page={pagination?.page ?? page}
        totalPages={pagination?.totalPages ?? totalPages}
        pageSize={pagination?.pageSize ?? pageSize}
        totalItems={pagination?.totalItems ?? totalItems}
        hasPreviousPage={pagination ? pagination.page > 1 : hasPreviousPage}
        hasNextPage={pagination ? pagination.page < pagination.totalPages : hasNextPage}
        onPreviousPage={pagination ? undefined : onPreviousPage}
        onNextPage={pagination ? undefined : onNextPage}
        previousPageHref={pagination?.previousPageHref}
        nextPageHref={pagination?.nextPageHref}
      />
    </>
  )
}
