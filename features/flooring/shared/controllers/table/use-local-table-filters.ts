"use client"

import { useCallback, useMemo, useState } from "react"
import type { TableFilterGroup } from "@/features/flooring/shared/ui/table/table-filter-controls"
import { createInitialTableFilterState, type TableFilterDefinition, type TableFilterState } from "./table-filter-state"

export function useLocalTableFilters({
  definitions,
  initialFilters,
}: {
  definitions: TableFilterDefinition[]
  initialFilters?: TableFilterState
}) {
  const [filters, setFilters] = useState(() => createInitialTableFilterState(definitions, initialFilters))

  const onFilterChange = useCallback((key: string, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }))
  }, [])

  const filterGroups = useMemo<TableFilterGroup[]>(
    () =>
      definitions.map((definition) => (
        definition.type === "tabs"
          ? {
              key: definition.key,
              type: "tabs" as const,
              ...(definition.label ? { label: definition.label } : {}),
              value: filters[definition.key] ?? definition.defaultValue,
              options: definition.options,
              onChange: (value: string) => onFilterChange(definition.key, value),
            }
          : {
              key: definition.key,
              type: "select" as const,
              label: definition.label ?? definition.key,
              value: filters[definition.key] ?? definition.defaultValue,
              options: definition.options,
              onChange: (value: string) => onFilterChange(definition.key, value),
            }
      )),
    [definitions, filters, onFilterChange],
  )

  return {
    filters,
    filterGroups,
    onFilterChange,
  }
}
