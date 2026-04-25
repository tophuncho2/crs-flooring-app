"use client"

import type { ReactNode } from "react"
import { DashboardListPageTable } from "@/modules/shared/engines/list-view/table/dashboard-list-page-table"
import { DashboardListRowCell } from "@/modules/shared/engines/list-view/table/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/modules/shared/engines/list-view/table/render-dashboard-row-cells"
import {
  formatInventoryImportNumber,
  formatInventoryQuantity,
  formatStableDate,
  type InventoryRow,
} from "@builders/domain"
import {
  ClickableTableRow,
  TableEmptyRow,
  TablePaginationControls,
} from "@/modules/shared/engines/list-view/table/table-shell"
import type { GroupedRowTree } from "@/modules/shared/engines/list-view/controllers/use-table-controls"
import { renderGroupedTableRows } from "@/modules/shared/engines/list-view/table/render-grouped-table-rows"

export function InventoryTable({
  rows,
  groupedRows,
  isGroupingEnabled,
  visibleColumnKeys,
  visibleColumns,
  page,
  totalPages,
  pageSize,
  totalItems,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  onOpenInventory,
}: {
  rows: InventoryRow[]
  groupedRows: GroupedRowTree<InventoryRow>[]
  isGroupingEnabled: boolean
  visibleColumnKeys: string[]
  visibleColumns: Array<{ key: string; label: string }>
  page: number
  totalPages: number
  pageSize: number
  totalItems: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  onOpenInventory: (id: string) => void
}) {
  function renderRow(row: InventoryRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      inventoryNumber: (columnIndex) => (
        <DashboardListRowCell key="inventoryNumber" columnIndex={columnIndex} className="font-medium">
          {row.inventoryNumber}
        </DashboardListRowCell>
      ),
      importNumber: (columnIndex) => (
        <DashboardListRowCell key="importNumber" columnIndex={columnIndex} className="font-medium text-blue-500">
          {formatInventoryImportNumber(row.importNumber)}
        </DashboardListRowCell>
      ),
      product: (columnIndex) => (
        <DashboardListRowCell key="product" columnIndex={columnIndex}>
          {row.productName}
        </DashboardListRowCell>
      ),
      itemNumber: (columnIndex) => (
        <DashboardListRowCell key="itemNumber" columnIndex={columnIndex}>
          {row.itemNumber}
        </DashboardListRowCell>
      ),
      startingStock: (columnIndex) => (
        <DashboardListRowCell key="startingStock" columnIndex={columnIndex}>
          {formatInventoryQuantity(row.startingStock, row.stockUnitAbbrev)}
        </DashboardListRowCell>
      ),
      totalCutSum: (columnIndex) => (
        <DashboardListRowCell key="totalCutSum" columnIndex={columnIndex}>
          {formatInventoryQuantity(row.totalCutSum, row.stockUnitAbbrev)}
        </DashboardListRowCell>
      ),
      stockBalance: (columnIndex) => (
        <DashboardListRowCell key="stockBalance" columnIndex={columnIndex} className="font-semibold">
          {formatInventoryQuantity(row.stockBalance, row.stockUnitAbbrev)}
        </DashboardListRowCell>
      ),
      coverageBalance: (columnIndex) => (
        <DashboardListRowCell key="coverageBalance" columnIndex={columnIndex}>
          {row.coverageBalance ? formatInventoryQuantity(row.coverageBalance, row.itemCoverageUnitAbbrev) : "-"}
        </DashboardListRowCell>
      ),
      section: (columnIndex) => (
        <DashboardListRowCell key="section" columnIndex={columnIndex}>
          {row.sectionNumber || "-"}
        </DashboardListRowCell>
      ),
      location: (columnIndex) => (
        <DashboardListRowCell key="location" columnIndex={columnIndex}>
          {row.locationShortCode || "-"}
        </DashboardListRowCell>
      ),
      warehouse: (columnIndex) => (
        <DashboardListRowCell key="warehouse" columnIndex={columnIndex}>
          {row.importWarehouseName || row.warehouseName || "-"}
        </DashboardListRowCell>
      ),
      fullLocation: (columnIndex) => (
        <DashboardListRowCell key="fullLocation" columnIndex={columnIndex}>
          {row.locationCode || "-"}
        </DashboardListRowCell>
      ),
      dyeLot: (columnIndex) => (
        <DashboardListRowCell key="dyeLot" columnIndex={columnIndex}>
          {row.dyeLot || "-"}
        </DashboardListRowCell>
      ),
      cost: (columnIndex) => (
        <DashboardListRowCell key="cost" columnIndex={columnIndex}>
          {row.cost || "-"}
        </DashboardListRowCell>
      ),
      freight: (columnIndex) => (
        <DashboardListRowCell key="freight" columnIndex={columnIndex}>
          {row.freight || "-"}
        </DashboardListRowCell>
      ),
      notes: (columnIndex) => (
        <DashboardListRowCell key="notes" columnIndex={columnIndex}>
          {row.notes || "-"}
        </DashboardListRowCell>
      ),
      updated: (columnIndex) => (
        <DashboardListRowCell key="updated" columnIndex={columnIndex}>
          {formatStableDate(row.updatedAt)}
        </DashboardListRowCell>
      ),
    }

    return (
      <ClickableTableRow
        key={row.id}
        ariaLabel={`Open inventory item ${row.itemNumber}`}
        onClick={() => onOpenInventory(row.id)}
      >
        {renderDashboardRowCells(visibleColumns, cells)}
      </ClickableTableRow>
    )
  }

  return (
    <>
      <DashboardListPageTable columns={visibleColumns} columnWidthRem={10}>
        {isGroupingEnabled
          ? renderGroupedTableRows({
              groups: groupedRows,
              colSpan: visibleColumnKeys.length,
              renderRow,
            })
          : rows.map((row) => renderRow(row))}
        {rows.length === 0 ? (
          <TableEmptyRow message="No live inventory rows yet." colSpan={visibleColumnKeys.length} />
        ) : null}
      </DashboardListPageTable>
      <TablePaginationControls
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        hasPreviousPage={hasPreviousPage}
        hasNextPage={hasNextPage}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
      />
    </>
  )
}
