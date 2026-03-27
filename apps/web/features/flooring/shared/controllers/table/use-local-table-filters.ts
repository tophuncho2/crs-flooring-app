"use client"

import { useCallback, useMemo, useState } from "react"
import type { TableFilterGroup } from "@/features/dashboard/shared/table/table-filter-controls"
import { createInitialTableFilterState, type TableFilterDefinition, type TableFilterState } from "./table-filter-state"

export function useLocalTableFilters({
  definitions,
  initialFilters,
}: {
  definitions: TableFilterDefinition[]
  initialFilters?: TableFilterState
}) {
  const [filters, setFilters] = useState(() => createInitialTableFilterState(definitions, initialFilters))

  const onToggleFilterValue = useCallback((key: string, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: current[key]?.includes(value)
        ? current[key].filter((entry) => entry !== value)
        : [...(current[key] ?? []), value],
    }))
  }, [])

  const onClearFilter = useCallback((key: string) => {
    setFilters((current) => ({
      ...current,
      [key]: [],
    }))
  }, [])

  const filterGroups = useMemo<TableFilterGroup[]>(
    () =>
      definitions.map((definition) => ({
        key: definition.key,
        type: definition.type,
        label: definition.label,
        clearLabel: definition.clearLabel,
        selectedValues: filters[definition.key] ?? [],
        options: definition.options,
        onToggleValue: (value: string) => onToggleFilterValue(definition.key, value),
        onClear: () => onClearFilter(definition.key),
      })),
    [definitions, filters, onClearFilter, onToggleFilterValue],
  )

  return {
    filters,
    filterGroups,
    onToggleFilterValue,
    onClearFilter,
  }
}
