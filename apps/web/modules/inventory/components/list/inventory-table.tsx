"use client"

import type { ReactNode } from "react"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import {
  composeRollNumberDisplay,
  formatFifoReceivedAtEastern,
  formatInventoryQuantity,
  formatStableDate,
  type InventoryRow,
} from "@builders/domain"

const INVENTORY_LIST_LAYOUT: GridLayout<InventoryRow> = {
  dataColumns: [
    { key: "stockBalance", label: "Stock", kind: "quantity", minWidth: 140, grow: 0, align: "start" },
    { key: "productName", label: "Product", minWidth: 200, grow: 1 },
    { key: "inventoryNumber", label: "Inv #", minWidth: 110, grow: 0 },
    { key: "rollNumber", label: "Roll #", minWidth: 160, grow: 0 },
    { key: "location", label: "Location", minWidth: 180, grow: 0 },
    { key: "dyeLot", label: "Dye Lot", minWidth: 160, grow: 0 },
    { key: "note", label: "Note", minWidth: 180, grow: 1 },
    { key: "coverageBalance", label: "Coverage", kind: "quantity", minWidth: 150, grow: 0, align: "end" },
    { key: "totalCutSum", label: "Total Cut", kind: "quantity", minWidth: 130, grow: 0, align: "end" },
    { key: "warehouse", label: "Warehouse", minWidth: 110, grow: 0 },
    { key: "fifoReceivedAt", label: "FIFO Received", minWidth: 150, grow: 0 },
    { key: "updatedAt", label: "Updated", minWidth: 120, grow: 0 },
  ],
}

export function InventoryTable({
  rows,
  onOpenInventory,
  pagination,
}: {
  rows: InventoryRow[]
  onOpenInventory: (id: string) => void
  pagination?: ReactNode
}) {
  return (
    <Grid<InventoryRow>
      rows={rows}
      layout={INVENTORY_LIST_LAYOUT}
      scroll={{ clipColumnsToTrack: true }}
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
      footerSlot={pagination}
    />
  )
}
