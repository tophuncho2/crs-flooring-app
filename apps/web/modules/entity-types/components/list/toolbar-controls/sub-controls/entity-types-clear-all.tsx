"use client"

import { ClearAllFiltersButton } from "@/engines/list-view"

export type EntityTypesClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

export function EntityTypesClearAll({ hasActive, onClick }: EntityTypesClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
