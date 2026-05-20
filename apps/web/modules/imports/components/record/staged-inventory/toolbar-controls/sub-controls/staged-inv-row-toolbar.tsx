"use client"

import type { StagedInventoryFilterRow } from "@builders/domain"

export type StagedInvRowToolbarProps = {
  filterRow: StagedInventoryFilterRow
  isSectionBusy: boolean
  onCreateNew: (filterRow: StagedInventoryFilterRow) => void
}

// Left-aligned control cluster shown under each filter row's staged-inventory
// sub-grid: create-new "+ Add Row" button.
export function StagedInvRowToolbar({
  filterRow,
  isSectionBusy,
  onCreateNew,
}: StagedInvRowToolbarProps) {
  return (
    <div className="flex items-center justify-start text-xs">
      <button
        type="button"
        className="rounded border border-[var(--panel-border)] px-2 py-1 hover:bg-[var(--panel-border)]/10 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onCreateNew(filterRow)}
        disabled={isSectionBusy}
      >
        + Add Row
      </button>
    </div>
  )
}
