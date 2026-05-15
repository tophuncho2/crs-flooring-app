"use client"

import { SearchControl } from "@/components/features/search"

export type WorkOrdersListSearchProps = {
  query: string
  onQueryChange: (next: string) => void
}

/**
 * Work-order list-view search input. Thin wrapper over `SearchControl`
 * that owns the work-order-specific placeholder copy. Lives alongside
 * the other toolbar controls so the toolbar's wiring is uniform.
 */
export function WorkOrdersListSearch({
  query,
  onQueryChange,
}: WorkOrdersListSearchProps) {
  return (
    <SearchControl
      query={query}
      onQueryChange={onQueryChange}
      placeholder="Search WO #, description, property, job type"
    />
  )
}
