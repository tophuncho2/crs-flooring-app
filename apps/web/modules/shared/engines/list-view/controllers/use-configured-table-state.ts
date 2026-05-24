"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  buildAllowedFilterValues,
  buildFilterSearchParams,
  createInitialTableFilterState,
  type TableFilterDefinition,
  type TableFilterState,
} from "./table-filter-state"
import type { TablePreferencePayload } from "./table-preferences"
import {
  normalizeColumnOrder,
  normalizeColumnVisibility,
  toggleGroupedColumnKey,
  useTableColumns,
  type TableColumnDefinition,
} from "./use-table-columns"
import { useTableControls, type GroupField, type SearchField, type TableValueGetter } from "./use-table-controls"

export type ConfiguredTableField<T> = TableColumnDefinition & {
  getValue: TableValueGetter<T>
  searchable?: boolean
  groupable?: boolean
  groupLabel?: string
}

type TableStateSyncMode = "history" | "router"

type ServerBackedTableState = {
  searchQuery: string
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
}

function areStringArraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false
  }

  return left.every((value, index) => value === right[index])
}

function areTableFilterStatesEqual(left: TableFilterState, right: TableFilterState) {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)

  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  return leftKeys.every((key) => areStringArraysEqual(left[key] ?? [], right[key] ?? []))
}

function buildQuerySearchParams({
  currentSearchParams,
  searchQuery,
  isAscendingSort,
  isGroupingEnabled,
  groupByKeys,
  filterDefinitions,
  filters,
}: {
  currentSearchParams: URLSearchParams
  searchQuery: string
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
  filterDefinitions: TableFilterDefinition[]
  filters: TableFilterState
}) {
  const nextSearchParams = buildFilterSearchParams(currentSearchParams, filterDefinitions, filters)
  const normalizedSearchQuery = searchQuery.trim()

  nextSearchParams.delete("page")

  if (normalizedSearchQuery) {
    nextSearchParams.set("q", normalizedSearchQuery)
  } else {
    nextSearchParams.delete("q")
  }

  nextSearchParams.set("sort", isAscendingSort ? "asc" : "desc")
  nextSearchParams.set("grouped", isGroupingEnabled ? "1" : "0")

  if (isGroupingEnabled && groupByKeys.length > 0) {
    nextSearchParams.set("groups", groupByKeys.join(","))
  } else {
    nextSearchParams.delete("groups")
  }

  return nextSearchParams
}

function sortFilterValuesByDefinition(definition: TableFilterDefinition, selectedValues: string[]) {
  const optionOrder = new Map(definition.options.map((option, index) => [option.value, index]))

  return [...selectedValues].sort((left, right) => (optionOrder.get(left) ?? Number.MAX_SAFE_INTEGER) - (optionOrder.get(right) ?? Number.MAX_SAFE_INTEGER))
}

/**
 * @deprecated Use `useListViewEngine` for new list views. This hook is the underlying
 * implementation — consume it through the engine facade, not directly.
 */
export function useConfiguredTableState<T>({
  rows,
  tableKey,
  fields,
  sortField,
  sortFieldKey,
  initialSearchQuery = "",
  defaultGrouped = false,
  defaultGroupKey = null,
  defaultGroupKeys,
  defaultAscending = true,
  initialPreferences = null,
  filterDefinitions = [],
  initialFilters,
  urlSyncMode = "history",
  disableClientFiltering = false,
  disableClientSorting = false,
  disableClientPagination = false,
}: {
  rows: T[]
  tableKey: string
  fields: ConfiguredTableField<T>[]
  sortField: TableValueGetter<T>
  sortFieldKey: string
  initialSearchQuery?: string
  defaultGrouped?: boolean
  defaultGroupKey?: string | null
  defaultGroupKeys?: string[]
  defaultAscending?: boolean
  initialPreferences?: TablePreferencePayload | null
  filterDefinitions?: TableFilterDefinition[]
  initialFilters?: TableFilterState
  urlSyncMode?: TableStateSyncMode
  disableClientFiltering?: boolean
  disableClientSorting?: boolean
  disableClientPagination?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSearchQueryRef = useRef(initialSearchQuery)

  const columns = useMemo(
    () => fields.map(({ key, label, defaultHidden, groupable }) => ({ key, label, defaultHidden, groupable })),
    [fields],
  )
  const searchFields = useMemo<SearchField<T>[]>(
    () => fields.filter((field) => field.searchable !== false).map((field) => ({ key: field.key, getValue: field.getValue })),
    [fields],
  )
  const groupFields = useMemo<GroupField<T>[]>(
    () =>
      fields
        .filter((field) => field.groupable !== false)
        .map((field) => ({ key: field.key, label: field.groupLabel ?? field.label, getValue: field.getValue })),
    [fields],
  )
  const allowedGroupKeys = useMemo(() => groupFields.map((field) => field.key), [groupFields])
  const allowedColumnKeys = useMemo(() => columns.map((column) => column.key), [columns])
  const initialFilterState = useMemo(
    () => createInitialTableFilterState(filterDefinitions, initialFilters ?? initialPreferences?.filters),
    [filterDefinitions, initialFilters, initialPreferences?.filters],
  )

  const tableControls = useTableControls({
    rows,
    searchFields,
    sortField,
    groupFields,
    initialSearchQuery,
    defaultGrouped,
    defaultGroupKey,
    defaultGroupKeys,
    defaultAscending,
    disableClientFiltering,
    disableClientSorting,
    disableClientPagination,
  })
  const tableColumns = useTableColumns({
    columns,
    initialPreferences: initialPreferences
      ? {
          ...initialPreferences,
          columnOrder: normalizeColumnOrder(allowedColumnKeys, initialPreferences.columnOrder),
          columnVisibility: normalizeColumnVisibility(
            allowedColumnKeys,
            initialPreferences.columnVisibility,
            columns.filter((column) => column.defaultHidden).map((column) => column.key),
          ),
        }
      : null,
  })
  const [filters, setFilters] = useState<TableFilterState>(initialFilterState)
  const allowedFilterValues = useMemo(() => buildAllowedFilterValues(filterDefinitions), [filterDefinitions])

  useEffect(() => {
    setFilters((current) => (areTableFilterStatesEqual(current, initialFilterState) ? current : initialFilterState))
  }, [initialFilterState])

  const getCurrentSearchParams = useCallback(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search)
    }

    return new URLSearchParams(searchParams?.toString() ?? "")
  }, [searchParams])

  const replaceUrl = useCallback((nextState: ServerBackedTableState, nextFilters: TableFilterState) => {
    if (!pathname) return

    const nextSearchParams = buildQuerySearchParams({
      currentSearchParams: getCurrentSearchParams(),
      searchQuery: nextState.searchQuery,
      isAscendingSort: nextState.isAscendingSort,
      isGroupingEnabled: nextState.isGroupingEnabled,
      groupByKeys: nextState.groupByKeys,
      filterDefinitions,
      filters: nextFilters,
    })
    const nextQueryString = nextSearchParams.toString()
    const nextHref = nextQueryString ? `${pathname}?${nextQueryString}` : pathname

    if (urlSyncMode === "router") {
      router.replace(nextHref, { scroll: false })
      return
    }

    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", nextHref)
    }
  }, [filterDefinitions, getCurrentSearchParams, pathname, router, urlSyncMode])

  useEffect(() => {
    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current)
      }
    }
  }, [])

  const onSearchQueryChange = useCallback((value: string) => {
    tableControls.setSearchQuery(value)
  }, [tableControls])

  useEffect(() => {
    if (lastSearchQueryRef.current === tableControls.searchQuery) {
      return
    }

    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current)
    }

    searchDebounceTimerRef.current = setTimeout(() => {
      replaceUrl(
        {
          searchQuery: tableControls.searchQuery,
          isAscendingSort: tableControls.isAscendingSort,
          isGroupingEnabled: tableControls.isGroupingEnabled,
          groupByKeys: tableControls.groupByKeys,
        },
        filters,
      )
      lastSearchQueryRef.current = tableControls.searchQuery
    }, 300)

    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current)
      }
    }
  }, [filters, replaceUrl, tableControls.groupByKeys, tableControls.isAscendingSort, tableControls.isGroupingEnabled, tableControls.searchQuery])

  const onToggleSort = useCallback(() => {
    const nextIsAscendingSort = !tableControls.isAscendingSort
    tableControls.setIsAscendingSort(nextIsAscendingSort)
    replaceUrl(
      {
        searchQuery: tableControls.searchQuery,
        isAscendingSort: nextIsAscendingSort,
        isGroupingEnabled: tableControls.isGroupingEnabled,
        groupByKeys: tableControls.groupByKeys,
      },
      filters,
    )
  }, [filters, replaceUrl, tableControls])

  const onToggleGroupedColumn = useCallback((columnKey: string) => {
    const nextGroupByKeys = toggleGroupedColumnKey(
      tableControls.groupByKeys,
      columnKey,
      allowedGroupKeys,
    )
    const nextIsGroupingEnabled = nextGroupByKeys.length > 0

    tableControls.setGroupByKeys(nextGroupByKeys)
    tableControls.setIsGroupingEnabled(nextIsGroupingEnabled)
    replaceUrl(
      {
        searchQuery: tableControls.searchQuery,
        isAscendingSort: tableControls.isAscendingSort,
        isGroupingEnabled: nextIsGroupingEnabled,
        groupByKeys: nextGroupByKeys,
      },
      filters,
    )
  }, [allowedGroupKeys, filters, replaceUrl, tableControls])

  const onToggleFilterValue = useCallback((key: string, value: string) => {
    const definition = filterDefinitions.find((entry) => entry.key === key)
    if (!definition) return

    setFilters((current) => {
      const nextValues = current[key]?.includes(value)
        ? current[key].filter((entry) => entry !== value)
        : sortFilterValuesByDefinition(definition, [...(current[key] ?? []), value])
      const nextFilters = {
        ...current,
        [key]: nextValues,
      }

      replaceUrl(
        {
          searchQuery: tableControls.searchQuery,
          isAscendingSort: tableControls.isAscendingSort,
          isGroupingEnabled: tableControls.isGroupingEnabled,
          groupByKeys: tableControls.groupByKeys,
        },
        nextFilters,
      )

      return nextFilters
    })
  }, [filterDefinitions, replaceUrl, tableControls.groupByKeys, tableControls.isAscendingSort, tableControls.isGroupingEnabled, tableControls.searchQuery])

  const onClearFilter = useCallback((key: string) => {
    setFilters((current) => {
      if ((current[key] ?? []).length === 0) {
        return current
      }

      const nextFilters = {
        ...current,
        [key]: [],
      }

      replaceUrl(
        {
          searchQuery: tableControls.searchQuery,
          isAscendingSort: tableControls.isAscendingSort,
          isGroupingEnabled: tableControls.isGroupingEnabled,
          groupByKeys: tableControls.groupByKeys,
        },
        nextFilters,
      )

      return nextFilters
    })
  }, [replaceUrl, tableControls.groupByKeys, tableControls.isAscendingSort, tableControls.isGroupingEnabled, tableControls.searchQuery])

  const onToggleColumnVisibility = useCallback((columnKey: string, isVisible: boolean) => {
    const visibleCount = allowedColumnKeys.filter((key) => tableColumns.columnVisibility[key] !== false).length
    if (!isVisible && visibleCount <= 1 && tableColumns.columnVisibility[columnKey] !== false) {
      return
    }

    tableColumns.toggleColumnVisibility(columnKey, isVisible)
  }, [allowedColumnKeys, tableColumns])

  const onMoveColumn = useCallback((columnKey: string, direction: "up" | "down") => {
    const currentIndex = tableColumns.columnOrder.indexOf(columnKey)
    if (currentIndex === -1) {
      return
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= tableColumns.columnOrder.length) {
      return
    }

    tableColumns.moveColumn(columnKey, direction)
  }, [tableColumns])

  const onSetColumnOrder = useCallback((nextOrder: string[]) => {
    const normalizedOrder = normalizeColumnOrder(allowedColumnKeys, nextOrder)
    tableColumns.setColumnOrder(normalizedOrder)
  }, [allowedColumnKeys, tableColumns])

  const filterGroups = useMemo(
    () =>
      filterDefinitions.map((definition) => ({
        key: definition.key,
        type: definition.type,
        label: definition.label,
        clearLabel: definition.clearLabel,
        selectedValues: filters[definition.key] ?? [],
        options: definition.options,
        onToggleValue: (value: string) => onToggleFilterValue(definition.key, value),
        onClear: () => onClearFilter(definition.key),
      })),
    [filterDefinitions, filters, onClearFilter, onToggleFilterValue],
  )

  return {
    fields,
    columns,
    searchFields,
    searchQuery: tableControls.searchQuery,
    setSearchQuery: tableControls.setSearchQuery,
    onSearchQueryChange,
    isAscendingSort: tableControls.isAscendingSort,
    setIsAscendingSort: tableControls.setIsAscendingSort,
    onToggleSort,
    isGroupingEnabled: tableControls.isGroupingEnabled,
    setIsGroupingEnabled: tableControls.setIsGroupingEnabled,
    groupByKey: tableControls.groupByKey,
    setGroupByKey: tableControls.setGroupByKey,
    groupByKeys: tableControls.groupByKeys,
    setGroupByKeys: tableControls.setGroupByKeys,
    updateGroupByKeyAtIndex: tableControls.updateGroupByKeyAtIndex,
    addGroupByKey: tableControls.addGroupByKey,
    removeGroupByKeyAtIndex: tableControls.removeGroupByKeyAtIndex,
    toggleGroupByKey: tableControls.toggleGroupByKey,
    onToggleGroupedColumn,
    groupFields,
    filters,
    filterGroups,
    allowedFilterValues,
    filteredRows: tableControls.filteredRows,
    sortedRows: tableControls.sortedRows,
    allSortedRows: tableControls.allSortedRows,
    groupedRows: tableControls.groupedRows,
    groupedRowTree: tableControls.groupedRowTree,
    page: tableControls.page,
    pageSize: tableControls.pageSize,
    totalPages: tableControls.totalPages,
    hasPreviousPage: tableControls.hasPreviousPage,
    hasNextPage: tableControls.hasNextPage,
    goToPreviousPage: tableControls.goToPreviousPage,
    goToNextPage: tableControls.goToNextPage,
    setPage: tableControls.setPage,
    allColumns: tableColumns.allColumns,
    visibleColumns: tableColumns.visibleColumns,
    columnVisibility: tableColumns.columnVisibility,
    columnOrder: tableColumns.columnOrder,
    hiddenColumnKeys: tableColumns.hiddenColumnKeys,
    toggleColumnVisibility: onToggleColumnVisibility,
    moveColumn: onMoveColumn,
    setColumnOrder: onSetColumnOrder,
  }
}
