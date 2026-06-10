"use client"

import { SearchControl } from "@/engines/list-view"

export type LaborPaymentsListSearchProps = {
  query: string
  onQueryChange: (next: string) => void
}

export function LaborPaymentsListSearch({ query, onQueryChange }: LaborPaymentsListSearchProps) {
  return (
    <SearchControl
      query={query}
      onQueryChange={onQueryChange}
      placeholder="Search by contact"
    />
  )
}
