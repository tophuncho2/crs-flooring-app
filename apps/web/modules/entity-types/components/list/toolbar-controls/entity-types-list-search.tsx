"use client"

import { SearchControl } from "@/engines/list-view"

export type EntityTypesListSearchProps = {
  query: string
  onQueryChange: (next: string) => void
}

export function EntityTypesListSearch({ query, onQueryChange }: EntityTypesListSearchProps) {
  return (
    <SearchControl
      query={query}
      onQueryChange={onQueryChange}
      placeholder="Search entity types"
    />
  )
}
