"use client"

import { ClearAllFiltersButton } from "@/components/features/filter"

export type ImportsClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

export function ImportsClearAll({ hasActive, onClick }: ImportsClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
