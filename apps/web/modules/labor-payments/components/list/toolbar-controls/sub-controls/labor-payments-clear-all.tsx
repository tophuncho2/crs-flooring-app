"use client"

import { ClearAllFiltersButton } from "@/engines/list-view"

export type LaborPaymentsClearAllProps = {
  hasActive: boolean
  onClick: () => void
}

export function LaborPaymentsClearAll({ hasActive, onClick }: LaborPaymentsClearAllProps) {
  return <ClearAllFiltersButton hasActive={hasActive} onClick={onClick} />
}
