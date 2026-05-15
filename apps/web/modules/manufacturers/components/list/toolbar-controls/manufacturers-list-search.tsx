"use client"

import { SearchControl } from "@/components/features/search"

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
