"use client"

import { useLocalTableFilters } from "./use-local-table-filters"
import type { TableFilterDefinition, TableFilterState } from "./table-filter-state"

export function usePageTableFilters({
  definitions,
  initialFilters,
}: {
  definitions: TableFilterDefinition[]
  initialFilters: TableFilterState
}) {
  return useLocalTableFilters({
    definitions,
    initialFilters,
  })
}
