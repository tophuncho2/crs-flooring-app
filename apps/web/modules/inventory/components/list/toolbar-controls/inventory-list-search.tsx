"use client"

import { SearchControl } from "@/components/features/search"

export type InventoryListSearchProps = {
  query: string
  onQueryChange: (next: string) => void
}

/**
 * Inventory list-view search input. Thin wrapper over `SearchControl`
 * that owns the inventory-specific placeholder copy. Lives alongside the
 * other toolbar controls so the toolbar's wiring is uniform.
 */
export function InventoryListSearch({
  query,
  onQueryChange,
}: InventoryListSearchProps) {
  return (
    <SearchControl
      query={query}
      onQueryChange={onQueryChange}
      placeholder="Search inventory item"
    />
  )
}
