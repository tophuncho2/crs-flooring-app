"use client"

import { SearchControl } from "@/components/features/search"

export type JobTypesListSearchProps = {
  query: string
  onQueryChange: (next: string) => void
}

export function JobTypesListSearch({ query, onQueryChange }: JobTypesListSearchProps) {
  return (
    <SearchControl
      query={query}
      onQueryChange={onQueryChange}
      placeholder="Search job types"
    />
  )
}
