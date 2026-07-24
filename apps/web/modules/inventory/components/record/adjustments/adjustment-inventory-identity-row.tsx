"use client"

import type { InventoryRow } from "@builders/domain"
import { DataTable } from "@/engines/list-view"
import { INVENTORY_LIST_COLUMNS } from "../../list/table/inventory-list-columns"
import { renderInventoryRowCell } from "../../list/table/inventory-row-cell"

export type AdjustmentInventoryIdentityRowProps = {
  /** The inventory item the adjustment targets, rendered as a single list row. */
  row: InventoryRow
  /**
   * When provided, a "Change" button re-opens the picker (open/unlocked flow).
   * Omit for the locked flow — the strip renders read-only (confirmation only).
   */
  onChange?: () => void
  /** Disables the Change button while a save is in flight. */
  disabled?: boolean
}

/**
 * The "Selected item" identity strip at the top of an adjustment create modal —
 * the targeted inventory rendered as the same single list row the inventory list
 * shows. Shared across both modal shells; varies by data only: supply `onChange`
 * for the open/unlocked flow (the work-order modal — a "Change" button re-opens
 * the picker), omit it for the locked flow (the inventory record view — read-only
 * confirmation, since the item is always the record you're on).
 */
export function AdjustmentInventoryIdentityRow({
  row,
  onChange,
  disabled = false,
}: AdjustmentInventoryIdentityRowProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/55">
          Selected item
        </span>
        {onChange ? (
          <button
            type="button"
            onClick={onChange}
            disabled={disabled}
            className="shrink-0 rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]/80 transition hover:border-sky-500/45 hover:text-[var(--foreground)] disabled:opacity-50"
          >
            Change
          </button>
        ) : null}
      </div>
      {/* Bleed the row to the modal panel wall (-mx-5 cancels the RecordModal
          body's px-5) + squared corners, so it reads flush like every other
          table. The "Selected item" label above stays inset. */}
      <div className="-mx-5">
        <DataTable rows={[row]} columns={INVENTORY_LIST_COLUMNS} renderCell={renderInventoryRowCell} flush />
      </div>
    </div>
  )
}
