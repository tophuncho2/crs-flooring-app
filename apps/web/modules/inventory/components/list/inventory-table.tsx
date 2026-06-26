"use client"

import { Copy, Plus } from "lucide-react"
import { DataTable, type ListSelection, type PaginateContract } from "@/engines/list-view"
import { RecordOptionsMenu } from "@/engines/common"
import type { InventoryRow } from "@builders/domain"
import { INVENTORY_LIST_COLUMNS } from "./table/inventory-list-columns"
import { renderInventoryRowCell } from "./table/inventory-row-cell"

export function InventoryTable({
  rows,
  onOpenInventory,
  onDuplicateInventory,
  onAddAdjustment,
  selection,
  sort,
  sorts,
  onSort,
  pagination,
}: {
  rows: InventoryRow[]
  onOpenInventory: (id: string) => void
  onDuplicateInventory: (id: string) => void
  /** Row ⋮ → "Add Adjustment": open the record in adjustment-create mode. */
  onAddAdjustment: (id: string) => void
  /** Row-selection state — drives the checkbox column + Select-All (CSV export scope). */
  selection?: ListSelection
  /** Active server-side sort (drives the header carets). */
  sort?: { field: string; direction: "asc" | "desc" } | null
  /** Active ordered multi-column sort (drives carets + priority badges). */
  sorts?: ReadonlyArray<{ field: string; direction: "asc" | "desc" }>
  /** Header click → re-sort by that column key. */
  onSort?: (key: string) => void
  pagination?: PaginateContract
}) {
  const pageIds = rows.map((row) => row.id)

  return (
    <DataTable<InventoryRow>
      rows={rows}
      columns={INVENTORY_LIST_COLUMNS}
      empty="No inventory rows match these filters."
      selection={
        selection
          ? {
              selectedIds: selection.selectedIds,
              onToggleRow: selection.toggle,
              isSelectionActive: selection.selectedCount > 0,
              selectedCount: selection.selectedCount,
              eligibleCount: pageIds.length,
              onToggleAll: () => selection.toggleAll(pageIds),
            }
          : undefined
      }
      sort={sort}
      sorts={sorts}
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
