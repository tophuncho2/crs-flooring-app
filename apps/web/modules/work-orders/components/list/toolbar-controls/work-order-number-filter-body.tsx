"use client"

import { DebouncedSearchControl } from "@/engines/list-view"

export type WorkOrderNumberFilterBodyProps = {
  value: string
  onChange: (next: string) => void
}

/**
 * The work-order `workOrderNumber` exact-search body — a single debounced search
 * bar. Relocated out of the toolbar's per-column search card into the table's
 * gutter TableOptions menu as the `WO #` tab.
 *
 * Pure body — no trigger/popover chrome of its own (the popover + anchoring come
 * from the engine's `AnchoredPanel`, same as `ScheduledForFilterBody`). The fixed
 * width matches the other menu tab bodies; `normal-case`/`tracking-normal` reset
 * the surrounding uppercase styling for the input.
 */
export function WorkOrderNumberFilterBody({ value, onChange }: WorkOrderNumberFilterBodyProps) {
  return (
    <div className="flex w-[15rem] flex-col normal-case tracking-normal">
      <DebouncedSearchControl
        value={value}
        onCommit={onChange}
        placeholder="WO #"
        ariaLabel="Search work orders by work order number"
      />
    </div>
  )
}
