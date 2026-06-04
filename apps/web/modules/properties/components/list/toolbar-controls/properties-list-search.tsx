"use client"

import { SearchControl } from "@/engines/list-view"

export type PropertiesListSearchProps = {
  query: string
  onQueryChange: (next: string) => void
}

export function PropertiesListSearch({
  query,
  onQueryChange,
}: PropertiesListSearchProps) {
  return (
    <SearchControl
      query={query}
      onQueryChange={onQueryChange}
      placeholder="Search property"
    />
  )
}
