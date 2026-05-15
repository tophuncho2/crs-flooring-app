"use client"

import { CheckboxCell } from "@/components/cells"

export type StagedRowSelectCellProps = {
  editable: boolean
  isSelected: boolean
  onToggle: () => void
  ariaLabel: string
}

// Per-row selection checkbox rendered inside the staged-inventory sub-grid.
// The stop-propagation wrapper prevents the click from bubbling up to the
// row's onRowClick (which opens the edit panel for DRAFT rows).
export function StagedRowSelectCell({
  editable,
  isSelected,
  onToggle,
  ariaLabel,
}: StagedRowSelectCellProps) {
  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <CheckboxCell
        editable={editable}
        value={isSelected}
        onChange={onToggle}
        ariaLabel={ariaLabel}
      />
    </div>
  )
}
