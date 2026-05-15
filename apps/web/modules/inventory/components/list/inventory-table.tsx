"use client"

import type { ReactNode } from "react"
import { DataTable } from "@/components/data-table"
import type { InventoryRow } from "@builders/domain"
import { INVENTORY_LIST_COLUMNS } from "./grid/inventory-list-columns"
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
    <DataTable<InventoryRow>
      rows={rows}
      columns={INVENTORY_LIST_COLUMNS}
      empty="No inventory rows match these filters."
      onRowClick={(row) => onOpenInventory(row.id)}
      getRowAriaLabel={(row) => `Open inventory item ${row.inventoryNumber}`}
      renderCell={renderInventoryRowCell}
      footerSlot={pagination}
    />
  )
}
