"use client"

import { ChevronDown } from "lucide-react"

/**
 * Placeholder chip for a Purchase Order picker. Visual matches the
 * closed-state trigger of `AsyncRichDropdown` so the toolbar reads as a
 * full grid of controls even before the query layer is wired up.
 * Replace with a real picker wrapper once the search endpoint exists.
 */
export function PurchaseOrderFilterChip() {
  return (
    <button
      type="button"
      disabled
      aria-label="Filter inventory by purchase order (coming soon)"
      className="flex w-full items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-left text-sm text-[var(--foreground)]/55 outline-none transition disabled:cursor-not-allowed"
    >
      <span>Purchase order #</span>
      <ChevronDown size={16} className="shrink-0 text-[var(--foreground)]/40" />
    </button>
  )
}
