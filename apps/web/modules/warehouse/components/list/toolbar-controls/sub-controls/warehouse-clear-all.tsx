"use client"

import { ClearAllFiltersButton } from "@/engines/list-view"

export type WarehouseClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

export function WarehouseClearAll({ hasActive, onClick }: WarehouseClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
