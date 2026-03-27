"use client"

import type { ReactNode } from "react"
import { DashboardListPageTable } from "@/features/dashboard/shared/list-page/dashboard-list-page-table"
import { DashboardListRowCell } from "@/features/dashboard/shared/list-page/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/features/dashboard/shared/list-page/render-dashboard-row-cells"
import { formatStableDate } from "@/features/flooring/shared/domain/date-format"
import { StatusPill } from "@/features/dashboard/shared/feedback/status-pill"
import { DeleteRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import {
  ClickableTableRow,
  TableEmptyRow,
  TablePaginationControls,
} from "@/features/dashboard/shared/table/table-shell"
import type { GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import { renderGroupedTableRows } from "@/features/dashboard/shared/table/render-grouped-table-rows"
import { formatInventoryImportNumber, formatInventoryQuantity } from "@/features/flooring/inventory/domain/formatters"
import type { InventoryRow } from "@/features/flooring/inventory/domain/types"
import {
  formatImportStatus,
  formatTransportType,
  getImportStatusFieldClass,
  getTransportTypeFieldClass,
} from "@/features/flooring/imports/contracts"

export function InventoryTable({
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
  deletingInventoryId,
  onDeleteInventory,
  onOpenInventory,
}: {
  rows: InventoryRow[]
  groupedRows: GroupedRowTree<InventoryRow>[]
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
  deletingInventoryId: string | null
  onDeleteInventory: (id: string) => void
  onOpenInventory: (id: string) => void
}) {
  function renderRow(row: InventoryRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      importNumber: (columnIndex) => (
        <DashboardListRowCell key="importNumber" columnIndex={columnIndex} className="font-medium text-blue-500">
          {formatInventoryImportNumber(row.importNumber)}
        </DashboardListRowCell>
      ),
      importTag: (columnIndex) => <DashboardListRowCell key="importTag" columnIndex={columnIndex}>{row.importTag || "-"}</DashboardListRowCell>,
      status: (columnIndex) => (
        <DashboardListRowCell key="status" columnIndex={columnIndex}>
          <StatusPill label={formatImportStatus(row.importStatus)} toneClassName={getImportStatusFieldClass(row.importStatus)} />
        </DashboardListRowCell>
      ),
      transport: (columnIndex) => (
        <DashboardListRowCell key="transport" columnIndex={columnIndex}>
          <StatusPill label={formatTransportType(row.importTransportType)} toneClassName={getTransportTypeFieldClass(row.importTransportType)} />
        </DashboardListRowCell>
      ),
      product: (columnIndex) => <DashboardListRowCell key="product" columnIndex={columnIndex}>{row.productName}</DashboardListRowCell>,
      itemNumber: (columnIndex) => <DashboardListRowCell key="itemNumber" columnIndex={columnIndex}>{row.itemNumber}</DashboardListRowCell>,
      stockCount: (columnIndex) => <DashboardListRowCell key="stockCount" columnIndex={columnIndex}>{formatInventoryQuantity(row.stockCount, row.stockUnit)}</DashboardListRowCell>,
      cutTotal: (columnIndex) => <DashboardListRowCell key="cutTotal" columnIndex={columnIndex}>{formatInventoryQuantity(row.cutTotal, row.stockUnit)}</DashboardListRowCell>,
      runningBalance: (columnIndex) => <DashboardListRowCell key="runningBalance" columnIndex={columnIndex} className="font-semibold">{formatInventoryQuantity(row.runningBalance, row.stockUnit)}</DashboardListRowCell>,
      section: (columnIndex) => <DashboardListRowCell key="section" columnIndex={columnIndex}>{row.sectionName || "-"}</DashboardListRowCell>,
      location: (columnIndex) => <DashboardListRowCell key="location" columnIndex={columnIndex}>{row.locationCode || "-"}</DashboardListRowCell>,
      warehouse: (columnIndex) => <DashboardListRowCell key="warehouse" columnIndex={columnIndex}>{row.importWarehouseName || row.warehouseName || "-"}</DashboardListRowCell>,
      dyeLot: (columnIndex) => <DashboardListRowCell key="dyeLot" columnIndex={columnIndex}>{row.dyeLot || "-"}</DashboardListRowCell>,
      cost: (columnIndex) => <DashboardListRowCell key="cost" columnIndex={columnIndex}>{row.cost || "-"}</DashboardListRowCell>,
      freight: (columnIndex) => <DashboardListRowCell key="freight" columnIndex={columnIndex}>{row.freight || "-"}</DashboardListRowCell>,
      notes: (columnIndex) => <DashboardListRowCell key="notes" columnIndex={columnIndex}>{row.notes || "-"}</DashboardListRowCell>,
      updated: (columnIndex) => <DashboardListRowCell key="updated" columnIndex={columnIndex}>{formatStableDate(row.updatedAt)}</DashboardListRowCell>,
      delete: (columnIndex) => (
        <DashboardListRowCell key="delete" columnIndex={columnIndex}>
          <DeleteRowButton onClick={() => onDeleteInventory(row.id)} disabled={deletingInventoryId === row.id}>
            {deletingInventoryId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </DashboardListRowCell>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open inventory item ${row.itemNumber}`} onClick={() => onOpenInventory(row.id)}>
        {renderDashboardRowCells(visibleColumns, cells)}
      </ClickableTableRow>
    )
  }

  return (
    <>
      <DashboardListPageTable minWidthClass="min-w-[1680px]" columns={visibleColumns}>
        {isGroupingEnabled
          ? renderGroupedTableRows({
              groups: groupedRows,
              colSpan: visibleColumnKeys.length,
              renderRow,
            })
          : rows.map((row) => renderRow(row))}
        {rows.length === 0 ? <TableEmptyRow message="No live inventory rows yet." colSpan={visibleColumnKeys.length} /> : null}
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
