"use client"

import { ClearAllFiltersButton } from "@/components/features/filter"

export type ProductsClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

export function ProductsClearAll({ hasActive, onClick }: ProductsClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
