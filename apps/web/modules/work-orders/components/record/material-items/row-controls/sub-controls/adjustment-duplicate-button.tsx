"use client"

import { DuplicateRowButton } from "@/components/features/duplicate-row"

export type CutLogDuplicateButtonProps = {
  /** True when the source row's status is "PENDING" — the only status eligible for duplicate. */
  isPending: boolean
  /** True when the surrounding material-items section is mid-save. */
  isSectionBusy: boolean
  onClick: () => void
}

/**
 * Cut-log "duplicate" affordance for the work-orders side. Unlike the
 * staged-inventory equivalent this does NOT invoke a duplicate use case —
 * clicking simply opens the cut-log side panel in create mode with the
 * source row's inventory pre-selected. Avoids re-running inventory-balance
 * recalculation that a real duplicate would trigger.
 *
 * Enabled only for `PENDING` cut logs; QUEUED / FINAL / VOID are disabled
 * with an explanatory tooltip.
 */
export function CutLogDuplicateButton({
  isPending,
  isSectionBusy,
  onClick,
}: CutLogDuplicateButtonProps) {
  const title = isPending
    ? "Duplicate this cut log (opens a new form with the same inventory item)"
    : "Only pending cut logs can be duplicated"
  return (
    <DuplicateRowButton
      ariaLabel="Duplicate cut log"
      title={title}
      editable={isPending && !isSectionBusy}
      onClick={onClick}
    />
  )
}
