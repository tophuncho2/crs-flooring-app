"use client"

import { ClearAllFiltersButton } from "@/engines/list-view"

export type ManagementCompaniesClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

export function ManagementCompaniesClearAll({
  hasActive,
  onClick,
}: ManagementCompaniesClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
