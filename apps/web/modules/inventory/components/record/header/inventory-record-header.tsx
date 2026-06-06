"use client"

import type { InventoryRecordSelectionController } from "@/modules/inventory/controllers/record/use-inventory-record-selection"
import { InventoryOptionsGrid } from "./inventory-options-grid"

/**
 * The inventory reference-header body (rendered inside the shared
 * `RecordReferenceHeader` card). When expanded it shows the multi-bar picker
 * grid (Warehouse + Inv # / Roll # / Dye lot / Note search bars over a paginated
 * results table); when an item is selected and the picker is collapsed it shows
 * a compact summary with a "Change" affordance to re-open the grid. The labeled
 * card chrome, the Clear action, and the dirty discard-guard all live in the
 * `RecordReferenceHeader` primitive.
 */
export function InventoryRecordHeader({
  selection,
  expanded,
  onToggleExpanded,
  onSelectWarehouse,
  onSelectInventory,
}: {
  selection: InventoryRecordSelectionController
  expanded: boolean
  onToggleExpanded: () => void
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

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-[var(--foreground)]">
          {selection.inventoryLabel ?? "No item selected"}
        </div>
        {selection.warehouseLabel ? (
          <div className="truncate text-xs text-[var(--foreground)]/60">
            {selection.warehouseLabel}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onToggleExpanded}
        className="shrink-0 rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]/80 transition hover:border-sky-500/45 hover:text-[var(--foreground)]"
      >
        Change
      </button>
    </div>
  )
}
