"use client"

import { Copy, Plus } from "lucide-react"
import { DataTable, type PaginateContract } from "@/engines/list-view"
import { RecordOptionsMenu } from "@/engines/common"
import type { InventoryRow } from "@builders/domain"
import { INVENTORY_LIST_COLUMNS } from "./table/inventory-list-columns"
import { renderInventoryRowCell } from "./table/inventory-row-cell"

export function InventoryTable({
  rows,
  onOpenInventory,
  onDuplicateInventory,
  onAddAdjustment,
  sort,
  onSort,
  pagination,
}: {
  rows: InventoryRow[]
  onOpenInventory: (id: string) => void
  onDuplicateInventory: (id: string) => void
  /** Row ⋮ → "Add Adjustment": open the record in adjustment-create mode. */
  onAddAdjustment: (id: string) => void
  /** Active server-side sort (drives the header carets). */
  sort?: { field: string; direction: "asc" | "desc" } | null
  /** Header click → re-sort by that column key. */
  onSort?: (key: string) => void
  pagination?: PaginateContract
}) {
  return (
    <DataTable<InventoryRow>
      rows={rows}
      columns={INVENTORY_LIST_COLUMNS}
      empty="No inventory rows match these filters."
      sort={sort}
      onSort={onSort}
      onOpenRow={(row) => onOpenInventory(row.id)}
      rowActions={(row) => (
        <RecordOptionsMenu
          ariaLabel={`Options for inventory item ${row.inventoryNumber}`}
          items={[
            {
              key: "duplicate",
              label: "Duplicate",
              icon: <Copy size={14} aria-hidden="true" />,
              onClick: () => onDuplicateInventory(row.id),
            },
            {
              key: "add-adjustment",
              label: "Add Adjustment",
              icon: <Plus size={14} aria-hidden="true" />,
              onClick: () => onAddAdjustment(row.id),
            },
          ]}
        />
      )}
      getRowAriaLabel={(row) => `Open inventory item ${row.inventoryNumber}`}
      renderCell={renderInventoryRowCell}
      pagination={pagination}
    />
  )
}
