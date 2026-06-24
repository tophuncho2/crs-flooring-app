"use client"

import { ClearAllFiltersButton } from "@/engines/list-view"

export type EntitiesClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

export function EntitiesClearAll({
  hasActive,
  onClick,
}: EntitiesClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
