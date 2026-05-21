"use client"

import { SearchControl } from "@/components/features/search"

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
