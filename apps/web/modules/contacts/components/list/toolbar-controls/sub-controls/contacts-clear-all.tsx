"use client"

import { ClearAllFiltersButton } from "@/engines/list-view"

export type ContactsClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

export function ContactsClearAll({ hasActive, onClick }: ContactsClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
