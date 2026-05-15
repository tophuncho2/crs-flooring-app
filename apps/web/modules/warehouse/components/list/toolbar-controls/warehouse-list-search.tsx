"use client"

import { SearchControl } from "@/components/features/search"

export type WarehouseListSearchProps = {
  query: string
  onQueryChange: (next: string) => void
}

export function WarehouseListSearch({ query, onQueryChange }: WarehouseListSearchProps) {
  return (
    <SearchControl
      query={query}
      onQueryChange={onQueryChange}
      placeholder="name, address, phone"
    />
  )
}
