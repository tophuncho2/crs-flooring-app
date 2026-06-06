"use client"

import { DataTable } from "@/engines/list-view"
import type { InventoryRow } from "@builders/domain"
import { INVENTORY_LIST_COLUMNS } from "../../list/table/inventory-list-columns"
import { renderInventoryRowCell } from "../../list/table/inventory-row-cell"

/**
 * The selected inventory item rendered as the same single row the list view
 * shows (list `DataTable` columns + cell renderer, display-only). Shared by the
 * record-view collapsed reference header and the duplicate form's locked
 * reference header so both read identically; future column additions land here
 * (and in `INVENTORY_LIST_COLUMNS`).
 */
export function InventoryReferenceRow({ inventory }: { inventory: InventoryRow }) {
  return (
    <DataTable
      rows={[inventory]}
      columns={INVENTORY_LIST_COLUMNS}
      renderCell={renderInventoryRowCell}
    />
  )
}
