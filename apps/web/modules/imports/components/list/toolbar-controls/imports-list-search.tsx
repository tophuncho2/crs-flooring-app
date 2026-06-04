"use client"

import { SearchControl } from "@/engines/list-view"

export type ImportsListSearchProps = {
  query: string
  onQueryChange: (next: string) => void
}

export function ImportsListSearch({ query, onQueryChange }: ImportsListSearchProps) {
  return (
    <SearchControl
      query={query}
      onQueryChange={onQueryChange}
      placeholder="Search PO #"
    />
  )
}
