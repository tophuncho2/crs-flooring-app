"use client"

import { SelectAllButton } from "@/engines/record-view"

export type SelectAllEligibleButtonProps = {
  isSelectionActive: boolean
  selectedCount: number
  eligibleCount: number
  canSelect: boolean
  onToggle: () => void
}

export function SelectAllEligibleButton({
  isSelectionActive,
  selectedCount,
  eligibleCount,
  canSelect,
  onToggle,
}: SelectAllEligibleButtonProps) {
  return (
    <SelectAllButton
      isSelectionActive={isSelectionActive}
      selectedCount={selectedCount}
      eligibleCount={eligibleCount}
      canSelect={canSelect}
      onToggle={onToggle}
    />
  )
}
