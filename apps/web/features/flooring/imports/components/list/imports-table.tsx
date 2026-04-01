"use client"

import type { ReactNode } from "react"
import { DashboardListPageTable } from "@/features/dashboard/shared/list-page/dashboard-list-page-table"
import { DashboardListRowCell } from "@/features/dashboard/shared/list-page/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/features/dashboard/shared/list-page/render-dashboard-row-cells"
import { formatStableDate } from "@/features/flooring/shared/domain/date-format"
import { StatusPill } from "@/features/dashboard/shared/feedback/status-pill"
import {
  ClickableTableRow,
  TableEmptyRow,
  TablePaginationControls,
} from "@/features/dashboard/shared/table/table-shell"
import type { GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import { renderGroupedTableRows } from "@/features/dashboard/shared/table/render-grouped-table-rows"
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
  onOpenImport: (id: string) => void
}) {
  function renderRow(row: ImportRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      importNumber: (columnIndex) => (
        <DashboardListRowCell key="importNumber" columnIndex={columnIndex} className="font-medium text-blue-500">
          IMP-{String(row.importNumber).padStart(4, "0")}
        </DashboardListRowCell>
      ),
      tag: (columnIndex) => <DashboardListRowCell key="tag" columnIndex={columnIndex}>{row.tag || "-"}</DashboardListRowCell>,
      transport: (columnIndex) => (
        <DashboardListRowCell key="transport" columnIndex={columnIndex}>
          <StatusPill label={formatTransportType(row.transportType)} toneClassName={getTransportTypeFieldClass(row.transportType)} />
        </DashboardListRowCell>
      ),
      status: (columnIndex) => (
        <DashboardListRowCell key="status" columnIndex={columnIndex}>
          <StatusPill label={formatImportStatus(row.status)} toneClassName={getImportStatusFieldClass(row.status)} />
        </DashboardListRowCell>
      ),
      warehouse: (columnIndex) => <DashboardListRowCell key="warehouse" columnIndex={columnIndex}>{row.warehouseName || "-"}</DashboardListRowCell>,
      created: (columnIndex) => <DashboardListRowCell key="created" columnIndex={columnIndex}>{formatStableDate(row.createdAt)}</DashboardListRowCell>,
      items: (columnIndex) => <DashboardListRowCell key="items" columnIndex={columnIndex}>{row.itemsCount}</DashboardListRowCell>,
    }

    return (
      <ClickableTableRow
        key={row.id}
        ariaLabel={`Open import ${String(row.importNumber).padStart(4, "0")}`}
        onClick={() => onOpenImport(row.id)}
      >
        {renderDashboardRowCells(visibleColumns, cells)}
      </ClickableTableRow>
    )
  }

  return (
    <>
      <DashboardListPageTable minWidthClass="min-w-[980px]" columns={visibleColumns}>
        {isGroupingEnabled
          ? renderGroupedTableRows({
              groups: groupedRows,
              colSpan: visibleColumnKeys.length,
              renderRow,
            })
          : rows.map((row) => renderRow(row))}
        {rows.length === 0 ? <TableEmptyRow message="No imports logged yet." colSpan={visibleColumnKeys.length} /> : null}
      </DashboardListPageTable>
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
