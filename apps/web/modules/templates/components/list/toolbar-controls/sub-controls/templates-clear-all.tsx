"use client"

import { ClearAllFiltersButton } from "@/engines/list-view"

export type TemplatesClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

export function TemplatesClearAll({ hasActive, onClick }: TemplatesClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
