"use client"

import { ClearAllFiltersButton } from "@/components/features/filter"

export type WarehouseClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

export function WarehouseClearAll({ hasActive, onClick }: WarehouseClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
