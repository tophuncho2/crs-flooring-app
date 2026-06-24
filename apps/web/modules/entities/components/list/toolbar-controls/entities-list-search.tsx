"use client"

import { SearchControl } from "@/engines/list-view"

export type EntitiesListSearchProps = {
  query: string
  onQueryChange: (next: string) => void
}

export function EntitiesListSearch({
  query,
  onQueryChange,
}: EntitiesListSearchProps) {
  return (
    <SearchControl
      query={query}
      onQueryChange={onQueryChange}
      placeholder="Search entity"
    />
  )
}
