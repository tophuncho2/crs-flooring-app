"use client"

import { ClearAllFiltersButton } from "@/components/features/filter"

export type ManufacturersClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

export function ManufacturersClearAll({ hasActive, onClick }: ManufacturersClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
