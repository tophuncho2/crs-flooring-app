"use client"

import { useCallback, useMemo, useState } from "react"
import {
  useConfiguredTableState,
  type ConfiguredTableField,
} from "./use-configured-table-state"
import type { TableFilterDefinition, TableFilterState } from "./table-filter-state"
import type { TablePreferencePayload } from "./table-preferences"
import type { GroupedRowTree } from "./use-table-controls"

// ---------------------------------------------------------------------------
// Contract types
// ---------------------------------------------------------------------------

export type SortEntry = {
  field: string
  direction: "asc" | "desc"
}

export type FilterCondition = {
  field: string
  values: string[]
}

export type Notice = {
  type: "error" | "success"
  message: string
}

export type ListViewEngineState<TRow> = {
  // Search
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  onSearchClear: () => void

  // Filter
  activeFilters: FilterCondition[]
  onFiltersChange: (filters: FilterCondition[]) => void
  activeFilterCount: number

  // Group
  groupField: string | null
  onGroupFieldChange: (field: string | null) => void

  // Sort
  sortStack: SortEntry[]
  onSortChange: (stack: SortEntry[]) => void

  // Columns
  visibleColumns: string[]
  columnOrder: string[]
  onColumnVisibilityChange: (col: string, visible: boolean) => void
  onColumnOrderChange: (order: string[]) => void

  // Notices
  notice: Notice | null
  pushNotice: (notice: Notice) => void
  clearNotice: () => void

  // Derived
  processedRows: TRow[]

  // Pagination
  page: number
  pageSize: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  goToPreviousPage: () => void
  goToNextPage: () => void

  // Grouping tree
  groupedRowTree: GroupedRowTree<TRow>[]
  isGroupingEnabled: boolean
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export type ListViewEngineConfig<TRow> = {
  rows: TRow[]
  tableKey: string
  fields: ConfiguredTableField<TRow>[]
  sortField: (row: TRow) => string | null | undefined
  sortFieldKey: string
  urlSync?: boolean
  initialSearchQuery?: string
  defaultAscending?: boolean
  defaultGroupKeys?: string[]
  filterDefinitions?: TableFilterDefinition[]
  initialFilters?: TableFilterState
  initialPreferences?: TablePreferencePayload | null
  disableClientFiltering?: boolean
  disableClientSorting?: boolean
  disableClientPagination?: boolean
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useListViewEngine<TRow>(
  config: ListViewEngineConfig<TRow>,
): ListViewEngineState<TRow> {
  const inner = useConfiguredTableState({
    rows: config.rows,
    tableKey: config.tableKey,
    fields: config.fields,
    sortField: config.sortField,
    sortFieldKey: config.sortFieldKey,
    initialSearchQuery: config.initialSearchQuery ?? "",
    defaultAscending: config.defaultAscending ?? true,
    defaultGroupKeys: config.defaultGroupKeys,
    defaultGrouped: (config.defaultGroupKeys ?? []).length > 0,
    initialPreferences: config.initialPreferences ?? null,
    filterDefinitions: config.filterDefinitions ?? [],
    initialFilters: config.initialFilters,
    urlSyncMode: config.urlSync === false ? undefined : "history",
    disableClientFiltering: config.disableClientFiltering,
    disableClientSorting: config.disableClientSorting,
    disableClientPagination: config.disableClientPagination,
  })

  // ---- Notices (new state not in useConfiguredTableState) ----

  const [notice, setNotice] = useState<Notice | null>(null)

  const pushNotice = useCallback((next: Notice) => {
    setNotice(next)
  }, [])

  const clearNotice = useCallback(() => {
    setNotice(null)
  }, [])

  // ---- Search ----

  const onSearchClear = useCallback(() => {
    inner.onSearchQueryChange("")
  }, [inner])

  // ---- Filter ----

  const activeFilters = useMemo<FilterCondition[]>(() => {
    return Object.entries(inner.filters)
      .filter(([, values]) => values.length > 0)
      .map(([field, values]) => ({ field, values }))
  }, [inner.filters])

  const onFiltersChange = useCallback((nextFilters: FilterCondition[]) => {
    const currentKeys = Object.keys(inner.filters)
    for (const key of currentKeys) {
      const incoming = nextFilters.find((entry) => entry.field === key)
      const currentValues = inner.filters[key] ?? []

      if (!incoming || incoming.values.length === 0) {
        if (currentValues.length > 0) {
          inner.filterGroups
            .find((group) => group.key === key)
            ?.onClear()
        }
      } else {
        const added = incoming.values.filter((v) => !currentValues.includes(v))
        const removed = currentValues.filter((v) => !incoming.values.includes(v))

        for (const value of removed) {
          inner.filterGroups
            .find((group) => group.key === key)
            ?.onToggleValue(value)
        }
        for (const value of added) {
          inner.filterGroups
            .find((group) => group.key === key)
            ?.onToggleValue(value)
        }
      }
    }
  }, [inner.filters, inner.filterGroups])

  const activeFilterCount = useMemo(() => {
    return activeFilters.reduce((count, entry) => count + entry.values.length, 0)
  }, [activeFilters])

  // ---- Group ----

  const groupField = inner.isGroupingEnabled ? (inner.groupByKeys[0] ?? null) : null

  const onGroupFieldChange = useCallback((field: string | null) => {
    inner.setGroupByKeys(field ? [field] : [])
    inner.setIsGroupingEnabled(field !== null)
  }, [inner])

  // ---- Sort ----

  const sortStack = useMemo<SortEntry[]>(() => {
    return [{ field: config.sortFieldKey, direction: inner.isAscendingSort ? "asc" : "desc" }]
  }, [config.sortFieldKey, inner.isAscendingSort])

  const onSortChange = useCallback((stack: SortEntry[]) => {
    const entry = stack[0]
    if (entry) {
      const nextAscending = entry.direction === "asc"
      if (nextAscending !== inner.isAscendingSort) {
        inner.onToggleSort()
      }
    }
  }, [inner])

  // ---- Columns ----

  const visibleColumnKeys = useMemo(
    () => inner.visibleColumns.map((col) => col.key),
    [inner.visibleColumns],
  )

  // ---- Assemble contract ----

  return {
    searchQuery: inner.searchQuery,
    onSearchQueryChange: inner.onSearchQueryChange,
    onSearchClear,

    activeFilters,
    onFiltersChange,
    activeFilterCount,

    groupField,
    onGroupFieldChange,

    sortStack,
    onSortChange,

    visibleColumns: visibleColumnKeys,
    columnOrder: inner.columnOrder,
    onColumnVisibilityChange: inner.toggleColumnVisibility,
    onColumnOrderChange: inner.setColumnOrder,

    notice,
    pushNotice,
    clearNotice,

    processedRows: inner.sortedRows,

    page: inner.page,
    pageSize: inner.pageSize,
    totalPages: inner.totalPages,
    hasPreviousPage: inner.hasPreviousPage,
    hasNextPage: inner.hasNextPage,
    goToPreviousPage: inner.goToPreviousPage,
    goToNextPage: inner.goToNextPage,

    groupedRowTree: inner.groupedRowTree,
    isGroupingEnabled: inner.isGroupingEnabled,
  }
}
