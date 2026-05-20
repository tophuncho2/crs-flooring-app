"use client"

import { SearchControl } from "@/components/features/search"

export type TemplatesListSearchProps = {
  query: string
  onQueryChange: (next: string) => void
}

export function TemplatesListSearch({
  query,
  onQueryChange,
}: TemplatesListSearchProps) {
  return (
    <SearchControl
      query={query}
      onQueryChange={onQueryChange}
      placeholder="unit type, description"
    />
  )
}
