"use client"

import { ClearAllFiltersButton } from "@/engines/list-view"

export type PaymentsClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

/**
 * Payments list-view clear-all button. Currently a pure passthrough to the
 * shared `ClearAllFiltersButton` — exists here so the toolbar's bottom-row
 * controls live alongside the other toolbar pieces and can later carry
 * payments-specific copy if needed.
 */
export function PaymentsClearAll({ hasActive, onClick }: PaymentsClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
