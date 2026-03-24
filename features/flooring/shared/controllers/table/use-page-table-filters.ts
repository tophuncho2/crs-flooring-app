"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import type { TableFilterGroup } from "@/features/flooring/shared/ui/table/table-filter-controls"
import {
  buildAllowedFilterValues,
  buildFilterSearchParams,
  createInitialTableFilterState,
  type TableFilterDefinition,
  type TableFilterState,
} from "./table-filter-state"

export function usePageTableFilters({
  definitions,
  initialFilters,
  onPersistState,
  getCurrentViewState,
}: {
  definitions: TableFilterDefinition[]
  initialFilters: TableFilterState
  onPersistState: (next: {
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    groupByKeys: string[]
    filters: TableFilterState
    allowedGroupKeys: string[]
    allowedFilterValues: Record<string, string[]>
  }) => void
  getCurrentViewState: () => {
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    groupByKeys: string[]
    allowedGroupKeys: string[]
  }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState(() => createInitialTableFilterState(definitions, initialFilters))
  const allowedFilterValues = useMemo(() => buildAllowedFilterValues(definitions), [definitions])

  const getCurrentSearchParams = useCallback(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search)
    }

    return new URLSearchParams(searchParams?.toString() ?? "")
  }, [searchParams])

  const onFilterChange = useCallback((key: string, value: string) => {
    setFilters((current) => {
      const nextFilters = {
        ...current,
        [key]: value,
      }
      const nextSearchParams = buildFilterSearchParams(getCurrentSearchParams(), definitions, nextFilters)
      const nextQueryString = nextSearchParams.toString()

      if (pathname) {
        router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, { scroll: false })
      }

      const viewState = getCurrentViewState()
      onPersistState({
        isAscendingSort: viewState.isAscendingSort,
        isGroupingEnabled: viewState.isGroupingEnabled,
        groupByKeys: viewState.groupByKeys,
        filters: nextFilters,
        allowedGroupKeys: viewState.allowedGroupKeys,
        allowedFilterValues,
      })

      return nextFilters
    })
  }, [allowedFilterValues, definitions, getCurrentSearchParams, getCurrentViewState, onPersistState, pathname, router])

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
    allowedFilterValues,
  }
}
