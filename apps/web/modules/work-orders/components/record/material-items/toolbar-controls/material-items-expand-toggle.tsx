"use client"

import { ExpandToggle } from "@/components/grid/expandable-rows"

export type MaterialItemsExpandToggleProps = {
  itemsCount: number
  allExpanded: boolean
  onToggle: () => void
}

// Section-header expand/collapse-all toggle. Reveals each material item's
// adjustment sub-grid when expanded. Renders nothing when the section is empty.
export function MaterialItemsExpandToggle({
  itemsCount,
  allExpanded,
  onToggle,
}: MaterialItemsExpandToggleProps) {
  if (itemsCount <= 0) return null
  return (
    <ExpandToggle
      expanded={allExpanded}
      onToggle={onToggle}
      ariaLabel={allExpanded ? "Collapse all material items" : "Expand all material items"}
    />
  )
}
