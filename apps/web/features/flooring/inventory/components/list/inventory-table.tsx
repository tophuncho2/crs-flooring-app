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
        <DashboardTableCell key="importNumber" columnIndex={columnIndex} className="font-medium text-blue-500">
          {formatInventoryImportNumber(row.importNumber)}
        </DashboardTableCell>
      ),
      importTag: (columnIndex) => <DashboardTableCell key="importTag" columnIndex={columnIndex}>{row.importTag || "-"}</DashboardTableCell>,
      status: (columnIndex) => (
        <DashboardTableCell key="status" columnIndex={columnIndex}>
          <StatusPill label={formatImportStatus(row.importStatus)} toneClassName={getImportStatusFieldClass(row.importStatus)} />
        </DashboardTableCell>
      ),
      transport: (columnIndex) => (
        <DashboardTableCell key="transport" columnIndex={columnIndex}>
          <StatusPill label={formatTransportType(row.importTransportType)} toneClassName={getTransportTypeFieldClass(row.importTransportType)} />
        </DashboardTableCell>
      ),
      product: (columnIndex) => <DashboardTableCell key="product" columnIndex={columnIndex}>{row.productName}</DashboardTableCell>,
      itemNumber: (columnIndex) => <DashboardTableCell key="itemNumber" columnIndex={columnIndex}>{row.itemNumber}</DashboardTableCell>,
      stockCount: (columnIndex) => <DashboardTableCell key="stockCount" columnIndex={columnIndex}>{formatInventoryQuantity(row.stockCount, row.stockUnit)}</DashboardTableCell>,
      cutTotal: (columnIndex) => <DashboardTableCell key="cutTotal" columnIndex={columnIndex}>{formatInventoryQuantity(row.cutTotal, row.stockUnit)}</DashboardTableCell>,
      runningBalance: (columnIndex) => <DashboardTableCell key="runningBalance" columnIndex={columnIndex} className="font-semibold">{formatInventoryQuantity(row.runningBalance, row.stockUnit)}</DashboardTableCell>,
      section: (columnIndex) => <DashboardTableCell key="section" columnIndex={columnIndex}>{row.sectionName || "-"}</DashboardTableCell>,
      location: (columnIndex) => <DashboardTableCell key="location" columnIndex={columnIndex}>{row.locationCode || "-"}</DashboardTableCell>,
      warehouse: (columnIndex) => <DashboardTableCell key="warehouse" columnIndex={columnIndex}>{row.importWarehouseName || row.warehouseName || "-"}</DashboardTableCell>,
      dyeLot: (columnIndex) => <DashboardTableCell key="dyeLot" columnIndex={columnIndex}>{row.dyeLot || "-"}</DashboardTableCell>,
      cost: (columnIndex) => <DashboardTableCell key="cost" columnIndex={columnIndex}>{row.cost || "-"}</DashboardTableCell>,
      freight: (columnIndex) => <DashboardTableCell key="freight" columnIndex={columnIndex}>{row.freight || "-"}</DashboardTableCell>,
      notes: (columnIndex) => <DashboardTableCell key="notes" columnIndex={columnIndex}>{row.notes || "-"}</DashboardTableCell>,
      updated: (columnIndex) => <DashboardTableCell key="updated" columnIndex={columnIndex}>{formatStableDate(row.updatedAt)}</DashboardTableCell>,
      delete: (columnIndex) => (
        <DashboardTableCell key="delete" columnIndex={columnIndex}>
          <DeleteRowButton onClick={() => onDeleteInventory(row.id)} disabled={deletingInventoryId === row.id}>
            {deletingInventoryId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </DashboardTableCell>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open inventory item ${row.itemNumber}`} onClick={() => onOpenInventory(row.id)}>
        {visibleColumnKeys.map((columnKey, columnIndex) => cells[columnKey](columnIndex))}
      </ClickableTableRow>
    )
  }

  return (
    <>
      <EmbeddedPageTableShell minWidthClass="min-w-[1680px]">
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
          {rows.length === 0 ? <TableEmptyRow message="No live inventory rows yet." colSpan={visibleColumnKeys.length} /> : null}
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
