"use client"

import { ExpandToggle } from "@/engines/record-view"

export type StagedInventoryExpandToggleProps = {
  itemsCount: number
  allExpanded: boolean
  onToggle: () => void
}

// Section-header expand/collapse-all toggle. Reveals each filter row's
// staged-inventory sub-grid when expanded. Renders nothing when the
// section is empty.
export function StagedInventoryExpandToggle({
  itemsCount,
  allExpanded,
  onToggle,
}: StagedInventoryExpandToggleProps) {
  if (itemsCount <= 0) return null
  return (
    <ExpandToggle
      expanded={allExpanded}
      onToggle={onToggle}
      ariaLabel={allExpanded ? "Collapse all filter rows" : "Expand all filter rows"}
    />
  )
}
