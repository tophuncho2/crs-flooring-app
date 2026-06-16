"use client"

import type { ReactNode } from "react"
import { DataTable } from "@/engines/list-view"
import type { InventoryRow } from "@builders/domain"
import { INVENTORY_LIST_COLUMNS } from "./table/inventory-list-columns"
import { renderInventoryRowCell } from "./table/inventory-row-cell"
import { InventoryRowOptionsMenu } from "./table/inventory-row-options-menu"

export function InventoryTable({
  rows,
  onOpenInventory,
  onDuplicateInventory,
  pagination,
}: {
  rows: InventoryRow[]
  onOpenInventory: (id: string) => void
  onDuplicateInventory: (id: string) => void
  pagination?: ReactNode
}) {
  return (
    <DataTable<InventoryRow>
      rows={rows}
      columns={INVENTORY_LIST_COLUMNS}
      empty="No inventory rows match these filters."
      onOpenRow={(row) => onOpenInventory(row.id)}
      rowActions={(row) => (
        <InventoryRowOptionsMenu
          onDuplicate={() => onDuplicateInventory(row.id)}
          ariaLabel={`Options for inventory item ${row.inventoryNumber}`}
        />
      )}
      getRowAriaLabel={(row) => `Open inventory item ${row.inventoryNumber}`}
      renderCell={renderInventoryRowCell}
      footerSlot={pagination}
    />
  )
}
