"use client"

import { ClearAllFiltersButton } from "@/components/features/filter"

export type WorkOrdersClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

/**
 * Work-order list-view clear-all button. Currently a pure passthrough to
 * the shared `ClearAllFiltersButton` — exists here so the toolbar's
 * bottom-row controls live alongside the other toolbar pieces and can
 * later carry work-order-specific copy if needed.
 */
export function WorkOrdersClearAll({ hasActive, onClick }: WorkOrdersClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
