"use client"

import { ClearAllFiltersButton } from "@/components/features/filter"

export type InventoryClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

/**
 * Inventory list-view clear-all button. Currently a pure passthrough to
 * the shared `ClearAllFiltersButton` — exists here so the toolbar's
 * bottom-row controls live alongside the other toolbar pieces and can
 * later carry inventory-specific copy if needed.
 */
export function InventoryClearAll({ hasActive, onClick }: InventoryClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
