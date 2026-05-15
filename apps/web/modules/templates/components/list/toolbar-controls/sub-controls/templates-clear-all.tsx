"use client"

import { ClearAllFiltersButton } from "@/components/features/filter"

export type TemplatesClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

export function TemplatesClearAll({ hasActive, onClick }: TemplatesClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
