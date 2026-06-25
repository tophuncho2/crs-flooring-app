"use client"

import { DebouncedSearchControl } from "@/engines/list-view"

export type InventoryNumberFilterBodyProps = {
  value: string
  onChange: (next: string) => void
}

/**
 * The inventory `invNumber` exact-search body — a single debounced search bar.
 * Relocated out of the toolbar's per-field search card into the table's gutter
 * TableOptions menu as the `Inv #` tab.
 *
 * Pure body — no trigger/popover chrome of its own (the popover + anchoring come
 * from the engine's `AnchoredPanel`, same as `ScheduledForFilterBody`). The fixed
 * width matches the other menu tab bodies; `normal-case`/`tracking-normal` reset
 * the surrounding uppercase styling for the input.
 */
export function InventoryNumberFilterBody({ value, onChange }: InventoryNumberFilterBodyProps) {
  return (
    <div className="flex w-[15rem] flex-col normal-case tracking-normal">
      <DebouncedSearchControl
        value={value}
        onCommit={onChange}
        placeholder="Inv #"
        ariaLabel="Search inventory by inventory number"
      />
    </div>
  )
}
