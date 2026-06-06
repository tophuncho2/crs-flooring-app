"use client"

import type { InventoryRecordSelectionController } from "@/modules/inventory/controllers/record/use-inventory-record-selection"
import { InventoryOptionsGrid } from "./inventory-options-grid"
import { InventoryReferenceRow } from "./inventory-reference-row"

/**
 * The inventory reference-header body (rendered inside the shared
 * `RecordReferenceHeader` card). When expanded it shows the multi-bar picker
 * grid (Warehouse + Inv # / Roll # / Dye lot / Note search bars over a paginated
 * results table); when an item is selected and the picker is collapsed it shows
 * the selected item as the same list-view row (reusing the list `DataTable`
 * columns + cell renderer, display-only). The labeled card chrome, the Change
 * and Clear actions, and the dirty discard-guard all live above this body.
 */
export function InventoryRecordHeader({
  selection,
  expanded,
  onSelectWarehouse,
  onSelectInventory,
}: {
  selection: InventoryRecordSelectionController
  expanded: boolean
  onSelectWarehouse: InventoryRecordSelectionController["selectWarehouse"]
  onSelectInventory: InventoryRecordSelectionController["selectInventory"]
}) {
  if (expanded) {
    return (
      <InventoryOptionsGrid
        selection={selection}
        onSelectWarehouse={onSelectWarehouse}
        onSelectInventory={onSelectInventory}
      />
    )
  }

  // Collapsed: render the selected item as the same row the list view shows.
  // The full row needs the loaded detail; during the brief load window
  // `selection.inventory` is null, so fall back to the label from URL state.
  if (!selection.inventory) {
    return (
      <div className="truncate text-sm font-medium text-[var(--foreground)]">
        {selection.inventoryLabel ?? "No item selected"}
      </div>
    )
  }

  return <InventoryReferenceRow inventory={selection.inventory} />
}
