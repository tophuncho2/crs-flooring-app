"use client"

import { TOOLBAR_TRIGGER_ACTIVE, TOOLBAR_TRIGGER_BASE } from "./toolbar-button-styles"

export type ClearAllFiltersButtonProps = {
  hasActive: boolean
  onClick: () => void
  label?: string
}

export function ClearAllFiltersButton({
  hasActive,
  onClick,
  label = "Clear all",
}: ClearAllFiltersButtonProps) {
  if (!hasActive) return null
  // Only ever shown while a filter/search is active, so it wears the vibrant
  // "in use" pill — identical to an active Sort/Filter/Search trigger.
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${TOOLBAR_TRIGGER_BASE} ${TOOLBAR_TRIGGER_ACTIVE}`}
    >
      {label}
    </button>
  )
}
