"use client"

import type { ReactNode } from "react"
import { formatStableDate } from "@/features/flooring/shared/domain/date-format"
import { StatusPill } from "@/features/flooring/shared/ui/feedback/status-pill"
import { DeleteRowButton } from "@/features/flooring/shared/ui/table/row-action-buttons"
import {
  ClickableTableRow,
  TableEmptyRow,
  TableGroupRow,
  TableHead,
  TableHeaderCell,
  TablePaginationControls,
  TableShell,
} from "@/features/flooring/shared/ui/table/table-shell"
import type { GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
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
    const cells: Record<string, ReactNode> = {
      importNumber: <td key="importNumber" className="px-3 py-2 font-medium text-blue-500">{formatInventoryImportNumber(row.importNumber)}</td>,
      importTag: <td key="importTag" className="px-3 py-2">{row.importTag || "-"}</td>,
      status: (
        <td key="status" className="px-3 py-2">
          <StatusPill label={formatImportStatus(row.importStatus)} toneClassName={getImportStatusFieldClass(row.importStatus)} />
        </td>
      ),
      transport: (
        <td key="transport" className="px-3 py-2">
          <StatusPill label={formatTransportType(row.importTransportType)} toneClassName={getTransportTypeFieldClass(row.importTransportType)} />
        </td>
      ),
      product: <td key="product" className="px-3 py-2">{row.productName}</td>,
      itemNumber: <td key="itemNumber" className="px-3 py-2">{row.itemNumber}</td>,
      stockCount: <td key="stockCount" className="px-3 py-2">{formatInventoryQuantity(row.stockCount, row.stockUnit)}</td>,
      cutTotal: <td key="cutTotal" className="px-3 py-2">{formatInventoryQuantity(row.cutTotal, row.stockUnit)}</td>,
      runningBalance: <td key="runningBalance" className="px-3 py-2 font-semibold">{formatInventoryQuantity(row.runningBalance, row.stockUnit)}</td>,
      section: <td key="section" className="px-3 py-2">{row.sectionName || "-"}</td>,
      location: <td key="location" className="px-3 py-2">{row.locationCode || "-"}</td>,
      warehouse: <td key="warehouse" className="px-3 py-2">{row.importWarehouseName || row.warehouseName || "-"}</td>,
      dyeLot: <td key="dyeLot" className="px-3 py-2">{row.dyeLot || "-"}</td>,
      cost: <td key="cost" className="px-3 py-2">{row.cost || "-"}</td>,
      freight: <td key="freight" className="px-3 py-2">{row.freight || "-"}</td>,
      notes: <td key="notes" className="px-3 py-2">{row.notes || "-"}</td>,
      updated: <td key="updated" className="px-3 py-2">{formatStableDate(row.updatedAt)}</td>,
      delete: (
        <td key="delete" className="px-3 py-2">
          <DeleteRowButton onClick={() => onDeleteInventory(row.id)} disabled={deletingInventoryId === row.id}>
            {deletingInventoryId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </td>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Open inventory item ${row.itemNumber}`} onClick={() => onOpenInventory(row.id)}>
        {visibleColumnKeys.map((columnKey) => cells[columnKey])}
      </ClickableTableRow>
    )
  }

  function renderGroupedRows(groups: GroupedRowTree<InventoryRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow
        key={`${group.depth}-${group.key}`}
        label={`${group.fieldLabel}: ${group.label}`}
        depth={group.depth}
        colSpan={visibleColumnKeys.length}
      />,
      ...(group.children.length > 0 ? renderGroupedRows(group.children) : group.rows.map((row) => renderRow(row))),
    ])
  }

  return (
    <>
      <TableShell minWidthClass="min-w-[1680px]">
        <TableHead>
          <tr>
            {visibleColumns.map((column) => (
              <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
            ))}
          </tr>
        </TableHead>
        <tbody>
          {isGroupingEnabled ? renderGroupedRows(groupedRows) : rows.map((row) => renderRow(row))}
          {rows.length === 0 ? <TableEmptyRow message="No live inventory rows yet." colSpan={visibleColumnKeys.length} /> : null}
        </tbody>
      </TableShell>
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
