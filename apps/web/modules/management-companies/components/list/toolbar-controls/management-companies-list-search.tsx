"use client"

import { SearchControl } from "@/components/features/search"

export type ManagementCompaniesListSearchProps = {
  query: string
  onQueryChange: (next: string) => void
}

export function ManagementCompaniesListSearch({
  query,
  onQueryChange,
}: ManagementCompaniesListSearchProps) {
  return (
    <SearchControl
      query={query}
      onQueryChange={onQueryChange}
      placeholder="Search company"
    />
  )
}
