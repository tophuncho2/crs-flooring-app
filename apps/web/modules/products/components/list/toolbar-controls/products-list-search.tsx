"use client"

import { SearchControl } from "@/engines/list-view"

export type ProductsListSearchProps = {
  query: string
  onQueryChange: (next: string) => void
}

export function ProductsListSearch({
  query,
  onQueryChange,
}: ProductsListSearchProps) {
  return (
    <SearchControl
      query={query}
      onQueryChange={onQueryChange}
      placeholder="Search products"
    />
  )
}
