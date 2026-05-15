"use client"

import { ClearAllFiltersButton } from "@/components/features/filter"

export type PropertiesClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

export function PropertiesClearAll({ hasActive, onClick }: PropertiesClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
