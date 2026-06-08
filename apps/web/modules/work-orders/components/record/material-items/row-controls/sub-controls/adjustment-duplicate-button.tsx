"use client"

import { DuplicateRowButton } from "@/engines/record-view"

export type AdjustmentDuplicateButtonProps = {
  /** True when the source row's status is "PENDING" — the only status eligible for duplicate. */
  isPending: boolean
  /** True when the surrounding material-items section is mid-save. */
  isSectionBusy: boolean
  onClick: () => void
}

/**
 * Adjustment "duplicate" affordance for the work-orders side. Unlike the
 * staged-inventory equivalent this does NOT invoke a duplicate use case —
 * clicking simply opens the adjustment side panel in create mode with the
 * source row's inventory pre-selected. Avoids re-running inventory-balance
 * recalculation that a real duplicate would trigger.
 *
 * Enabled only for `PENDING` adjustments; QUEUED / FINAL / VOID are disabled
 * with an explanatory tooltip.
 */
export function AdjustmentDuplicateButton({
  isPending,
  isSectionBusy,
  onClick,
}: AdjustmentDuplicateButtonProps) {
  const title = isPending
    ? "Duplicate this adjustment (opens a new form with the same inventory item)"
    : "Only pending adjustments can be duplicated"
  return (
    <DuplicateRowButton
      ariaLabel="Duplicate adjustment"
      title={title}
      editable={isPending && !isSectionBusy}
      onClick={onClick}
    />
  )
}
