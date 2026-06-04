"use client"

import { ClearAllFiltersButton } from "@/engines/list-view"

export type JobTypesClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

export function JobTypesClearAll({ hasActive, onClick }: JobTypesClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
