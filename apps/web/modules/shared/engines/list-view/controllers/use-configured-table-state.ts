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
import { patchTablePreference } from "./table-preference-client"
import type { TablePreferencePayload } from "./table-preferences"
import {
  normalizeColumnOrder,
  normalizeColumnVisibility,
  normalizeGroupedColumnKeys,
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

type PersistedStateContext = {
  allowedColumnKeys: string[]
  allowedSortKeys: string[]
  allowedGroupKeys: string[]
  allowedFilterValues: Record<string, string[]>
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

const tableStateSaveTimers = new Map<string, ReturnType<typeof setTimeout>>()
const tableStatePersistedCache = new Map<string, string>()
const tableStateInflightAbortControllers = new Map<string, AbortController>()

function serializeTableState(value: TablePreferencePayload) {
  return JSON.stringify({
    sort: value.sort,
    filters: Object.fromEntries(
      Object.entries(value.filters)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, values]) => [key, [...values]]),
    ),
    columnVisibility: Object.fromEntries(
      Object.entries(value.columnVisibility).sort(([left], [right]) => left.localeCompare(right)),
    ),
    columnOrder: value.columnOrder,
    grouping: value.grouping,
  })
}

function queuePersistTableState({
  tableKey,
  state,
  context,
  onError,
}: {
  tableKey: string
  state: TablePreferencePayload
  context: PersistedStateContext
  onError?: (message: string) => void
}) {
  const serializedState = serializeTableState(state)
  if (tableStatePersistedCache.get(tableKey) === serializedState) {
    return
  }

  const existingTimer = tableStateSaveTimers.get(tableKey)
  if (existingTimer) {
    clearTimeout(existingTimer)
  }

  const nextTimer = setTimeout(async () => {
    const previousAbortController = tableStateInflightAbortControllers.get(tableKey)
    if (previousAbortController) {
      previousAbortController.abort()
    }

    const abortController = new AbortController()
    tableStateInflightAbortControllers.set(tableKey, abortController)

    try {
      await patchTablePreference({
        tableKey,
        state,
        allowedColumnKeys: context.allowedColumnKeys,
        allowedSortKeys: context.allowedSortKeys,
        allowedGroupKeys: context.allowedGroupKeys,
        allowedFilterValues: context.allowedFilterValues,
        signal: abortController.signal,
      })
      tableStatePersistedCache.set(tableKey, serializedState)
    } catch (error) {
      if (abortController.signal.aborted) {
        return
      }

      onError?.(error instanceof Error ? error.message : "Failed to save table preferences")
    } finally {
      if (tableStateInflightAbortControllers.get(tableKey) === abortController) {
        tableStateInflightAbortControllers.delete(tableKey)
      }
    }
  }, 400)

  tableStateSaveTimers.set(tableKey, nextTimer)
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
  const [preferenceError, setPreferenceError] = useState("")
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

  useEffect(() => {
    const initialState: TablePreferencePayload = {
      sort: {
        key: sortFieldKey,
        direction: defaultAscending ? "asc" : "desc",
      },
      filters: initialFilterState,
      columnVisibility: normalizeColumnVisibility(
        allowedColumnKeys,
        initialPreferences?.columnVisibility,
        columns.filter((column) => column.defaultHidden).map((column) => column.key),
      ),
      columnOrder: normalizeColumnOrder(allowedColumnKeys, initialPreferences?.columnOrder ?? []),
      grouping: {
        enabled: defaultGrouped,
        keys: normalizeGroupedColumnKeys(defaultGroupKeys ?? [], allowedGroupKeys),
      },
    }

    tableStatePersistedCache.set(tableKey, serializeTableState(initialState))
  }, [allowedColumnKeys, allowedGroupKeys, columns, defaultAscending, defaultGroupKeys, defaultGrouped, filterDefinitions, initialFilterState, initialPreferences, sortFieldKey, tableKey])

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

  const persistedState = useMemo<TablePreferencePayload>(() => ({
    sort: {
      key: sortFieldKey,
      direction: tableControls.isAscendingSort ? "asc" : "desc",
    },
    filters,
    columnVisibility: tableColumns.columnVisibility,
    columnOrder: tableColumns.columnOrder,
    grouping: {
      enabled: tableControls.isGroupingEnabled,
      keys: tableControls.isGroupingEnabled ? normalizeGroupedColumnKeys(tableControls.groupByKeys, allowedGroupKeys) : [],
    },
  }), [
    allowedGroupKeys,
    filters,
    sortFieldKey,
    tableColumns.columnOrder,
    tableColumns.columnVisibility,
    tableControls.groupByKeys,
    tableControls.isAscendingSort,
    tableControls.isGroupingEnabled,
  ])

  const persistState = useCallback((nextState: TablePreferencePayload) => {
    queuePersistTableState({
      tableKey,
      state: nextState,
      context: {
        allowedColumnKeys,
        allowedSortKeys: [sortFieldKey],
        allowedGroupKeys,
        allowedFilterValues,
      },
      onError: setPreferenceError,
    })
  }, [allowedColumnKeys, allowedFilterValues, allowedGroupKeys, sortFieldKey, tableKey])

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
    }, 250)

    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current)
      }
    }
  }, [filters, replaceUrl, tableControls.groupByKeys, tableControls.isAscendingSort, tableControls.isGroupingEnabled, tableControls.searchQuery])

  const onToggleSort = useCallback(() => {
    setPreferenceError("")
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
    persistState({
      ...persistedState,
      sort: {
        key: sortFieldKey,
        direction: nextIsAscendingSort ? "asc" : "desc",
      },
    })
  }, [filters, persistState, persistedState, replaceUrl, sortFieldKey, tableControls])

  const onToggleGroupedColumn = useCallback((columnKey: string) => {
    setPreferenceError("")
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
    persistState({
      ...persistedState,
      grouping: {
        enabled: nextIsGroupingEnabled,
        keys: nextGroupByKeys,
      },
    })
  }, [allowedGroupKeys, filters, persistState, persistedState, replaceUrl, tableControls])

  const onToggleFilterValue = useCallback((key: string, value: string) => {
    const definition = filterDefinitions.find((entry) => entry.key === key)
    if (!definition) return

    setPreferenceError("")
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
      persistState({
        ...persistedState,
        filters: nextFilters,
      })

      return nextFilters
    })
  }, [filterDefinitions, persistState, persistedState, replaceUrl, tableControls.groupByKeys, tableControls.isAscendingSort, tableControls.isGroupingEnabled, tableControls.searchQuery])

  const onClearFilter = useCallback((key: string) => {
    setPreferenceError("")
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
      persistState({
        ...persistedState,
        filters: nextFilters,
      })

      return nextFilters
    })
  }, [persistState, persistedState, replaceUrl, tableControls.groupByKeys, tableControls.isAscendingSort, tableControls.isGroupingEnabled, tableControls.searchQuery])

  const onToggleColumnVisibility = useCallback((columnKey: string, isVisible: boolean) => {
    setPreferenceError("")
    const visibleCount = allowedColumnKeys.filter((key) => tableColumns.columnVisibility[key] !== false).length
    if (!isVisible && visibleCount <= 1 && tableColumns.columnVisibility[columnKey] !== false) {
      return
    }

    tableColumns.toggleColumnVisibility(columnKey, isVisible)

    const nextColumnVisibility = {
      ...tableColumns.columnVisibility,
      [columnKey]: isVisible,
    }

    persistState({
      ...persistedState,
      columnVisibility: nextColumnVisibility,
    })
  }, [allowedColumnKeys, persistState, persistedState, tableColumns])

  const onMoveColumn = useCallback((columnKey: string, direction: "up" | "down") => {
    setPreferenceError("")
    const currentIndex = tableColumns.columnOrder.indexOf(columnKey)
    if (currentIndex === -1) {
      return
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= tableColumns.columnOrder.length) {
      return
    }

    const nextColumnOrder = [...tableColumns.columnOrder]
    const [movedColumn] = nextColumnOrder.splice(currentIndex, 1)
    nextColumnOrder.splice(targetIndex, 0, movedColumn)
    tableColumns.moveColumn(columnKey, direction)
    persistState({
      ...persistedState,
      columnOrder: nextColumnOrder,
    })
  }, [persistState, persistedState, tableColumns])

  const onSetColumnOrder = useCallback((nextOrder: string[]) => {
    setPreferenceError("")
    const normalizedOrder = normalizeColumnOrder(allowedColumnKeys, nextOrder)
    tableColumns.setColumnOrder(normalizedOrder)
    persistState({
      ...persistedState,
      columnOrder: normalizedOrder,
    })
  }, [allowedColumnKeys, persistState, persistedState, tableColumns])

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
    preferenceError,
  }
}
