"use client"

import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { PaginateControls } from "@/components/features/paginate"
import {
  composeRollNumberDisplay,
  formatFifoReceivedAtEastern,
  formatInventoryQuantity,
  formatStableDate,
  type InventoryRow,
} from "@builders/domain"

const INVENTORY_LIST_LAYOUT: GridLayout<InventoryRow> = {
  dataColumns: [
    { key: "stockBalance", label: "Stock Balance", kind: "quantity", minWidth: 140, grow: 0, align: "end" },
    { key: "inventoryNumber", label: "Inv #", minWidth: 110, grow: 0 },
    { key: "productName", label: "Product", minWidth: 200, grow: 1 },
    { key: "rollNumber", label: "Roll #", minWidth: 120, grow: 0 },
    { key: "location", label: "Location", minWidth: 130, grow: 0 },
    { key: "dyeLot", label: "Dye Lot", minWidth: 120, grow: 0 },
    { key: "note", label: "Note", minWidth: 180, grow: 1 },
    { key: "warehouse", label: "Warehouse", minWidth: 160, grow: 1 },
    { key: "coverageBalance", label: "Coverage Balance", kind: "quantity", minWidth: 150, grow: 0, align: "end" },
    { key: "totalCutSum", label: "Total Cut", kind: "quantity", minWidth: 130, grow: 0, align: "end" },
    { key: "fifoReceivedAt", label: "FIFO Received", minWidth: 150, grow: 0 },
    { key: "updatedAt", label: "Updated", minWidth: 120, grow: 0 },
  ],
}

export function InventoryTable({
  rows,
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
  return (
    <Grid<InventoryRow>
      rows={rows}
      layout={INVENTORY_LIST_LAYOUT}
      empty={<GridEmpty>No inventory rows match these filters.</GridEmpty>}
      onRowClick={(row) => onOpenInventory(row.id)}
      getRowAriaLabel={(row) => `Open inventory item ${row.inventoryNumber}`}
      renderCell={(column, row) => {
        switch (column.key) {
          case "inventoryNumber":
            return <span className="font-medium">{row.inventoryNumber}</span>
          case "productName":
            return row.productName || "-"
          case "rollNumber":
            return composeRollNumberDisplay(row.rollPrefix, row.rollNumber) || "-"
          case "location":
            return row.location || "-"
          case "dyeLot":
            return row.dyeLot || "-"
          case "note":
            return row.note || "-"
          case "warehouse":
            return row.warehouseName || "-"
          case "stockBalance":
            return (
              <span className="font-semibold tabular-nums">
                {formatInventoryQuantity(row.stockBalance, row.stockUnitAbbrev)}
              </span>
            )
          case "coverageBalance":
            return row.coverageBalance ? (
              <span className="tabular-nums">
                {formatInventoryQuantity(row.coverageBalance, row.itemCoverageUnitAbbrev)}
              </span>
            ) : (
              <span className="text-[var(--text-muted)]">-</span>
            )
          case "totalCutSum":
            return (
              <span className="tabular-nums">
                {formatInventoryQuantity(row.totalCutSum, row.stockUnitAbbrev)}
              </span>
            )
          case "fifoReceivedAt":
            return formatFifoReceivedAtEastern(row.fifoReceivedAt)
          case "updatedAt":
            return formatStableDate(row.updatedAt)
          default:
            return "-"
        }
      }}
      footerSlot={
        <PaginateControls
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={onPreviousPage}
          onNextPage={onNextPage}
        />
      }
    />
  )
}
