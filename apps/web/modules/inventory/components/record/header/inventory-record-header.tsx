"use client"

import type { InventoryRecordSelectionController } from "@/modules/inventory/controllers/record/use-inventory-record-selection"
import type { InventoryOptionsGridController } from "@/modules/inventory/controllers/record/header/use-inventory-options-grid"
import { InventoryOptionsGrid } from "./inventory-options-grid"
import { InventoryReferenceRow } from "./inventory-reference-row"

/**
 * The inventory reference-header body (rendered inside the shared
 * `RecordReferenceHeader` card). When expanded it shows the multi-bar picker
 * grid (Warehouse + Inv # / Roll # / Dye lot / Note search bars over a paginated
 * results table); when an item is selected and the picker is collapsed it shows
 * the selected item as the same list-view row (reusing the list `DataTable`
 * columns + cell renderer, display-only). The labeled card chrome, the Re-select
 * and Clear actions, and the dirty discard-guard all live above this body. When
 * collapsed the selected row is clickable (`onReselect`) to re-open the picker.
 */
export function InventoryRecordHeader({
  selection,
  grid,
  expanded,
  onReselect,
  onSelectWarehouse,
  onSelectProduct,
  onSelectInventory,
}: {
  selection: InventoryRecordSelectionController
  grid: InventoryOptionsGridController
  expanded: boolean
  onReselect: () => void
  onSelectWarehouse: InventoryRecordSelectionController["selectWarehouse"]
  onSelectProduct: InventoryRecordSelectionController["selectProduct"]
  onSelectInventory: InventoryRecordSelectionController["selectInventory"]
}) {
  if (expanded) {
    return (
      <InventoryOptionsGrid
        selection={selection}
        grid={grid}
        onSelectWarehouse={onSelectWarehouse}
        onSelectProduct={onSelectProduct}
        onSelectInventory={onSelectInventory}
      />
    )
  }

  // Collapsed: render the selected item as the same row the list view shows,
  // clickable to re-open the picker. The full row needs the loaded detail; during
  // the brief load window `selection.inventory` is null, so fall back to the
  // label from URL state (also clickable to re-open).
  if (!selection.inventory) {
    return (
      <button
        type="button"
        onClick={onReselect}
        className="w-full truncate text-left text-sm font-medium text-[var(--foreground)]"
      >
        {selection.inventoryLabel ?? "No item selected"}
      </button>
    )
  }

  return <InventoryReferenceRow inventory={selection.inventory} onRowClick={onReselect} />
}
