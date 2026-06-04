"use client"

import { ClearAllFiltersButton } from "@/engines/list-view"

export type ProductsClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

export function ProductsClearAll({ hasActive, onClick }: ProductsClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
