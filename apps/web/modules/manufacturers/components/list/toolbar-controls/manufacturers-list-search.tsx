"use client"

import { SearchControl } from "@/engines/list-view"

export type ManufacturersListSearchProps = {
  query: string
  onQueryChange: (next: string) => void
}

export function ManufacturersListSearch({
  query,
  onQueryChange,
}: ManufacturersListSearchProps) {
  return (
    <SearchControl
      query={query}
      onQueryChange={onQueryChange}
      placeholder="Search manufacturer"
    />
  )
}
