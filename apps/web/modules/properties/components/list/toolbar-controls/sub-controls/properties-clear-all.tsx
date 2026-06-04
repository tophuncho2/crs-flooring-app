"use client"

import { ClearAllFiltersButton } from "@/engines/list-view"

export type PropertiesClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

export function PropertiesClearAll({ hasActive, onClick }: PropertiesClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
