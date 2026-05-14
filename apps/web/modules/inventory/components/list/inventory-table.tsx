"use client"

import type { ReactNode } from "react"
import { Grid, GridEmpty } from "@/components/grid"
import type { InventoryRow } from "@builders/domain"
import { INVENTORY_LIST_LAYOUT } from "./grid/inventory-list-layout"
import { renderInventoryRowCell } from "./grid/inventory-row-cell"

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
      renderCell={renderInventoryRowCell}
      footerSlot={pagination}
    />
  )
}
