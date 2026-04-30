"use client"

import { useQuery } from "@tanstack/react-query"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryState } from "nuqs"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ListInput, ListSort } from "@builders/application"
import type { TablePreferencePayload } from "@builders/domain"
import type {
  ListControllerFetchInput,
  ListControllerInput,
  ListControllerSsrInput,
} from "./contracts/list-controller-input"
import type {
  ListControllerOutput,
  ListFilterValueMap,
} from "./contracts/list-controller-output"
import { patchTablePreference } from "./table-preferences-client"

const SEARCH_DEBOUNCE_MS = 300
const PREFERENCE_DEBOUNCE_MS = 400

const preferenceTimers = new Map<string, ReturnType<typeof setTimeout>>()
const preferenceInflight = new Map<string, AbortController>()
const preferenceLastSerialized = new Map<string, string>()

function serializePreference(value: TablePreferencePayload) {
  return JSON.stringify({
    sort: value.sort,
    filters: Object.fromEntries(
      Object.entries(value.filters)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, vs]) => [k, [...vs]]),
    ),
    columnVisibility: Object.fromEntries(
      Object.entries(value.columnVisibility).sort(([a], [b]) => a.localeCompare(b)),
    ),
    columnOrder: value.columnOrder,
    grouping: value.grouping,
  })
}

function queuePersistPreference({
  tableKey,
  state,
  allowedSortKeys,
  allowedGroupKeys,
  onError,
}: {
  tableKey: string
  state: TablePreferencePayload
  allowedSortKeys?: string[]
  allowedGroupKeys?: string[]
  onError: (msg: string) => void
}) {
  const serialized = serializePreference(state)
  if (preferenceLastSerialized.get(tableKey) === serialized) return

  const existingTimer = preferenceTimers.get(tableKey)
  if (existingTimer) clearTimeout(existingTimer)

  const nextTimer = setTimeout(async () => {
    const previousAbort = preferenceInflight.get(tableKey)
    if (previousAbort) previousAbort.abort()

    const ac = new AbortController()
    preferenceInflight.set(tableKey, ac)
    try {
      await patchTablePreference({
        tableKey,
        state,
        allowedSortKeys,
        allowedGroupKeys,
        signal: ac.signal,
      })
      preferenceLastSerialized.set(tableKey, serialized)
    } catch (error) {
      if (ac.signal.aborted) return
      onError(error instanceof Error ? error.message : "Failed to save table preferences")
    } finally {
      if (preferenceInflight.get(tableKey) === ac) {
        preferenceInflight.delete(tableKey)
      }
    }
  }, PREFERENCE_DEBOUNCE_MS)

  preferenceTimers.set(tableKey, nextTimer)
}

function buildPreferencePayload({
  sortFieldKey,
  isAscendingSort,
  groupField,
  filters,
  basePrefs,
}: {
  sortFieldKey: string
  isAscendingSort: boolean
  groupField: string | null
  filters: ListFilterValueMap
  basePrefs: TablePreferencePayload | null | undefined
}): TablePreferencePayload {
  return {
    sort: { key: sortFieldKey, direction: isAscendingSort ? "asc" : "desc" },
    filters: { ...(basePrefs?.filters ?? {}), ...filters },
    columnVisibility: basePrefs?.columnVisibility ?? {},
    columnOrder: basePrefs?.columnOrder ?? [],
    grouping: {
      enabled: groupField !== null,
      keys: groupField ? [groupField] : [],
    },
  }
}

function readFiltersFromSearchParams(
  searchParams: URLSearchParams | null,
  filterableFields: readonly string[] | undefined,
  initialFilters: ListFilterValueMap,
): ListFilterValueMap {
  if (!filterableFields || filterableFields.length === 0) {
    return {}
  }

  const result: ListFilterValueMap = {}
  for (const key of filterableFields) {
    const fromUrl = searchParams ? searchParams.getAll(key) : []
    if (fromUrl.length > 0) {
      result[key] = [...fromUrl]
      continue
    }
    if (initialFilters[key]?.length) {
      result[key] = [...initialFilters[key]]
      continue
    }
    result[key] = []
  }
  return result
}

function writeFiltersToSearchParams(
  current: URLSearchParams,
  filterableFields: readonly string[] | undefined,
  filters: ListFilterValueMap,
): URLSearchParams {
  const next = new URLSearchParams(current)
  if (!filterableFields) return next

  for (const key of filterableFields) {
    next.delete(key)
    const values = filters[key]
    if (!values?.length) continue
    for (const value of values) next.append(key, value)
  }
  return next
}

function buildNextSearchParams(
  current: URLSearchParams,
  next: {
    searchQuery: string
    isAscendingSort: boolean
    groupField: string | null
    filters: ListFilterValueMap
    filterableFields: readonly string[] | undefined
  },
): URLSearchParams {
  const params = new URLSearchParams(current)
  params.delete("page")

  const trimmed = next.searchQuery.trim()
  if (trimmed) params.set("q", trimmed)
  else params.delete("q")

  params.set("sort", next.isAscendingSort ? "asc" : "desc")

  if (next.groupField) {
    params.set("grouped", "1")
    params.set("groups", next.groupField)
  } else {
    params.set("grouped", "0")
    params.delete("groups")
  }

  return writeFiltersToSearchParams(params, next.filterableFields, next.filters)
}

function asTypedFilters<TFilters>(filters: ListFilterValueMap): TFilters {
  return filters as unknown as TFilters
}

function normalizeInitialFilters<TFilters>(
  initial: TFilters | undefined,
  filterableFields: readonly string[] | undefined,
): ListFilterValueMap {
  if (!filterableFields || filterableFields.length === 0) return {}
  const map = (initial ?? {}) as Record<string, unknown>
  const result: ListFilterValueMap = {}
  for (const key of filterableFields) {
    const value = map[key]
    if (Array.isArray(value)) {
      result[key] = value.filter((entry): entry is string => typeof entry === "string")
    } else {
      result[key] = []
    }
  }
  return result
}

export function useServerListController<TRow, TFilters = Record<string, never>>(
  input: ListControllerInput<TRow, TFilters>,
): ListControllerOutput<TRow> {
  return input.mode === "fetch"
    ? useFetchListController<TRow, TFilters>(input)
    : useSsrListController<TRow, TFilters>(input)
}

function useSsrListController<TRow, TFilters>(
  input: ListControllerSsrInput<TRow, TFilters>,
): ListControllerOutput<TRow> {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialSort = input.initialSort ?? null
  const initialIsAscendingSort = initialSort ? initialSort.direction !== "desc" : true
  const initialGroupField = input.initialGroupField ?? null
  const sortFieldKey = initialSort?.field ?? input.allowedSortFields?.[0] ?? ""
  const allowedGroupFields = input.allowedGroupFields
  const allowedSortFields = input.allowedSortFields
  const filterableFields = input.filterableFields
  const tableKey = input.tableKey
  const initialTablePreferences = input.initialTablePreferences ?? null
  const urlSyncMode = input.urlSyncMode ?? "history"
  const initialFiltersMap = useMemo(
    () => normalizeInitialFilters(input.initialFilters, filterableFields),
    [filterableFields, input.initialFilters],
  )

  const [searchQuery, setSearchQuery] = useState(input.initialSearchQuery ?? "")
  const [isAscendingSort, setIsAscendingSort] = useState(initialIsAscendingSort)
  const [groupField, setGroupField] = useState<string | null>(initialGroupField)
  const [filters, setFilters] = useState<ListFilterValueMap>(initialFiltersMap)
  const [preferenceError, setPreferenceError] = useState("")

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSyncedSearchQueryRef = useRef(searchQuery)

  const getCurrentParams = useCallback(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search)
    }
    return new URLSearchParams(searchParams?.toString() ?? "")
  }, [searchParams])

  const writeUrl = useCallback(
    (next: {
      searchQuery: string
      isAscendingSort: boolean
      groupField: string | null
      filters: ListFilterValueMap
    }) => {
      if (!pathname) return
      const params = buildNextSearchParams(getCurrentParams(), {
        ...next,
        filterableFields,
      })
      const qs = params.toString()
      const href = qs ? `${pathname}?${qs}` : pathname

      if (urlSyncMode === "router") {
        router.replace(href, { scroll: false })
        return
      }

      if (typeof window !== "undefined") {
        window.history.replaceState(window.history.state, "", href)
      }
    },
    [filterableFields, getCurrentParams, pathname, router, urlSyncMode],
  )

  const persistPreferences = useCallback(
    (next: {
      isAscendingSort: boolean
      groupField: string | null
      filters: ListFilterValueMap
    }) => {
      if (!tableKey || !sortFieldKey) return

      const payload = buildPreferencePayload({
        sortFieldKey,
        isAscendingSort: next.isAscendingSort,
        groupField: next.groupField,
        filters: next.filters,
        basePrefs: initialTablePreferences,
      })

      queuePersistPreference({
        tableKey,
        state: payload,
        allowedSortKeys: allowedSortFields ? [...allowedSortFields] : [sortFieldKey],
        allowedGroupKeys: allowedGroupFields ? [...allowedGroupFields] : undefined,
        onError: setPreferenceError,
      })
    },
    [allowedGroupFields, allowedSortFields, initialTablePreferences, sortFieldKey, tableKey],
  )

  useEffect(() => {
    if (lastSyncedSearchQueryRef.current === searchQuery) return

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      writeUrl({ searchQuery, isAscendingSort, groupField, filters })
      lastSyncedSearchQueryRef.current = searchQuery
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchQuery, isAscendingSort, groupField, filters, writeUrl])

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [])

  const onSearchQueryChange = useCallback((next: string) => {
    setSearchQuery(next)
  }, [])

  const onToggleSortDirection = useCallback(() => {
    setPreferenceError("")
    setIsAscendingSort((prev) => {
      const next = !prev
      writeUrl({ searchQuery, isAscendingSort: next, groupField, filters })
      persistPreferences({ isAscendingSort: next, groupField, filters })
      return next
    })
  }, [filters, groupField, persistPreferences, searchQuery, writeUrl])

  const onSortChange = useCallback(
    (next: ListSort | null) => {
      if (!next) return
      setPreferenceError("")
      const nextAsc = next.direction === "asc"
      setIsAscendingSort(nextAsc)
      writeUrl({ searchQuery, isAscendingSort: nextAsc, groupField, filters })
      persistPreferences({ isAscendingSort: nextAsc, groupField, filters })
    },
    [filters, groupField, persistPreferences, searchQuery, writeUrl],
  )

  const onGroupFieldChange = useCallback(
    (next: string | null) => {
      setPreferenceError("")
      setGroupField(next)
      writeUrl({ searchQuery, isAscendingSort, groupField: next, filters })
      persistPreferences({ isAscendingSort, groupField: next, filters })
    },
    [filters, isAscendingSort, persistPreferences, searchQuery, writeUrl],
  )

  const onFilterChange = useCallback(
    (key: string, values: string[]) => {
      setPreferenceError("")
      setFilters((prev) => {
        const next: ListFilterValueMap = { ...prev, [key]: [...values] }
        writeUrl({ searchQuery, isAscendingSort, groupField, filters: next })
        persistPreferences({ isAscendingSort, groupField, filters: next })
        return next
      })
    },
    [groupField, isAscendingSort, persistPreferences, searchQuery, writeUrl],
  )

  const onClearAllFilters = useCallback(() => {
    if (!filterableFields || filterableFields.length === 0) return
    setPreferenceError("")
    const next: ListFilterValueMap = {}
    for (const key of filterableFields) next[key] = []
    setFilters(next)
    writeUrl({ searchQuery, isAscendingSort, groupField, filters: next })
    persistPreferences({ isAscendingSort, groupField, filters: next })
  }, [filterableFields, groupField, isAscendingSort, persistPreferences, searchQuery, writeUrl])

  const pagination = input.pagination
  const initialPage = input.initialPage ?? 1
  const declaredPageSize = input.pageSize ?? 50
  const page = pagination?.page ?? initialPage
  const pageSize = pagination?.pageSize ?? declaredPageSize
  const totalItems = pagination?.totalItems ?? input.initialTotal
  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize))
  const hasPreviousPage = page > 1
  const hasNextPage = page < totalPages
  const previousPageHref = pagination?.previousPageHref
  const nextPageHref = pagination?.nextPageHref

  const goToPage = useCallback(
    (next: number) => {
      if (!pathname) return
      const params = getCurrentParams()
      if (next <= 1) params.delete("page")
      else params.set("page", String(next))
      const qs = params.toString()
      const href = qs ? `${pathname}?${qs}` : pathname
      router.push(href, { scroll: false })
    },
    [getCurrentParams, pathname, router],
  )

  const goToPreviousPage = useCallback(() => {
    if (previousPageHref) {
      router.push(previousPageHref, { scroll: false })
      return
    }
    if (hasPreviousPage) goToPage(page - 1)
  }, [goToPage, hasPreviousPage, page, previousPageHref, router])

  const goToNextPage = useCallback(() => {
    if (nextPageHref) {
      router.push(nextPageHref, { scroll: false })
      return
    }
    if (hasNextPage) goToPage(page + 1)
  }, [goToPage, hasNextPage, nextPageHref, page, router])

  return {
    rows: input.initialRows,
    total: totalItems,
    groups: input.initialGroups,

    searchQuery,
    sort: sortFieldKey ? { field: sortFieldKey, direction: isAscendingSort ? "asc" : "desc" } : null,
    groupField,
    filters,
    page,
    pageSize,
    totalPages,

    onSearchQueryChange,
    onSortChange,
    onToggleSortDirection,
    onGroupFieldChange,
    onFilterChange,
    onClearAllFilters,

    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    goToPage,
    previousPageHref,
    nextPageHref,

    isLoading: false,
    isFetching: false,
    error: null,
    refetch: () => {},

    preferenceError,
  }
}

function useFetchListController<TRow, TFilters>(
  input: ListControllerFetchInput<TRow, TFilters>,
): ListControllerOutput<TRow> {
  const searchParams = useSearchParams()

  const initialSearchQuery = input.initialSearchQuery ?? ""
  const initialDirection = input.initialSort?.direction ?? "asc"
  const initialGroupValue = input.initialGroupField ?? ""
  const initialGroupedToggle: "0" | "1" = input.initialGroupField ? "1" : "0"
  const initialPageValue = input.initialPage ?? 1
  const sortFieldKey = input.initialSort?.field ?? input.allowedSortFields?.[0] ?? ""
  const allowedGroupFields = input.allowedGroupFields
  const allowedSortFields = input.allowedSortFields
  const filterableFields = input.filterableFields
  const tableKey = input.tableKey
  const initialTablePreferences = input.initialTablePreferences ?? null
  const declaredPageSize = input.pageSize ?? 50
  const consumerQueryKey = input.queryKey
  const listFn = input.listFn
  const initialData = input.initialData
  const initialFiltersMap = useMemo(
    () => normalizeInitialFilters(input.initialFilters, filterableFields),
    [filterableFields, input.initialFilters],
  )

  const [searchUrlValue, setSearchUrlValue] = useQueryState(
    "q",
    parseAsString.withDefault(initialSearchQuery),
  )
  const [sortDirection, setSortDirection] = useQueryState(
    "sort",
    parseAsStringEnum<"asc" | "desc">(["asc", "desc"]).withDefault(initialDirection),
  )
  const [groupedToggle, setGroupedToggle] = useQueryState(
    "grouped",
    parseAsStringEnum<"0" | "1">(["0", "1"]).withDefault(initialGroupedToggle),
  )
  const [groupFieldValue, setGroupFieldValue] = useQueryState(
    "groups",
    parseAsString.withDefault(initialGroupValue),
  )
  const [pageValue, setPageValue] = useQueryState(
    "page",
    parseAsInteger.withDefault(initialPageValue),
  )

  const [filters, setFilters] = useState<ListFilterValueMap>(() =>
    readFiltersFromSearchParams(searchParams, filterableFields, initialFiltersMap),
  )
  const [searchInputValue, setSearchInputValue] = useState(searchUrlValue)
  const [preferenceError, setPreferenceError] = useState("")
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSearchInputValue(searchUrlValue)
  }, [searchUrlValue])

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [])

  const writeFiltersUrl = useCallback(
    (nextFilters: ListFilterValueMap) => {
      if (!filterableFields || filterableFields.length === 0) return
      if (typeof window === "undefined") return
      const current = new URLSearchParams(window.location.search)
      const next = writeFiltersToSearchParams(current, filterableFields, nextFilters)
      next.delete("page")
      const qs = next.toString()
      const href = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
      window.history.replaceState(window.history.state, "", href)
    },
    [filterableFields],
  )

  const persistPreferences = useCallback(
    (next: {
      isAscendingSort: boolean
      groupField: string | null
      filters: ListFilterValueMap
    }) => {
      if (!tableKey || !sortFieldKey) return

      const payload = buildPreferencePayload({
        sortFieldKey,
        isAscendingSort: next.isAscendingSort,
        groupField: next.groupField,
        filters: next.filters,
        basePrefs: initialTablePreferences,
      })

      queuePersistPreference({
        tableKey,
        state: payload,
        allowedSortKeys: allowedSortFields ? [...allowedSortFields] : [sortFieldKey],
        allowedGroupKeys: allowedGroupFields ? [...allowedGroupFields] : undefined,
        onError: setPreferenceError,
      })
    },
    [allowedGroupFields, allowedSortFields, initialTablePreferences, sortFieldKey, tableKey],
  )

  const isGroupingEnabled = groupedToggle === "1"
  const groupFieldNormalized: string | null = isGroupingEnabled && groupFieldValue ? groupFieldValue : null
  const isAscendingSort = sortDirection !== "desc"

  const listInput: ListInput<TFilters> = useMemo(
    () => ({
      search: searchUrlValue?.trim() ? searchUrlValue.trim() : undefined,
      sort: sortFieldKey ? { field: sortFieldKey, direction: sortDirection } : undefined,
      filters: asTypedFilters<TFilters>(filters),
      group: groupFieldNormalized ? { field: groupFieldNormalized } : undefined,
      page: pageValue,
      pageSize: declaredPageSize,
    }),
    [
      declaredPageSize,
      filters,
      groupFieldNormalized,
      pageValue,
      searchUrlValue,
      sortDirection,
      sortFieldKey,
    ],
  )

  const queryKey = useMemo(() => [...consumerQueryKey, listInput], [consumerQueryKey, listInput])

  const queryResult = useQuery({
    queryKey,
    queryFn: () => listFn(listInput),
    initialData,
    placeholderData: (previous) => previous,
    refetchInterval: input.freshness?.refetchIntervalMs,
    staleTime: input.freshness?.staleTimeMs,
  })

  const rows = queryResult.data?.rows ?? []
  const total = queryResult.data?.total ?? 0
  const groups = queryResult.data?.groups
  const pageSize = listInput.pageSize
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasPreviousPage = pageValue > 1
  const hasNextPage = pageValue < totalPages

  const onSearchQueryChange = useCallback(
    (next: string) => {
      setSearchInputValue(next)
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = setTimeout(() => {
        const trimmed = next.trim()
        setSearchUrlValue(trimmed ? trimmed : null)
        if (pageValue !== 1) setPageValue(1)
      }, SEARCH_DEBOUNCE_MS)
    },
    [pageValue, setPageValue, setSearchUrlValue],
  )

  const onToggleSortDirection = useCallback(() => {
    setPreferenceError("")
    const nextDirection: "asc" | "desc" = sortDirection === "asc" ? "desc" : "asc"
    setSortDirection(nextDirection)
    if (pageValue !== 1) setPageValue(1)
    persistPreferences({
      isAscendingSort: nextDirection === "asc",
      groupField: groupFieldNormalized,
      filters,
    })
  }, [filters, groupFieldNormalized, pageValue, persistPreferences, setPageValue, setSortDirection, sortDirection])

  const onSortChange = useCallback(
    (next: ListSort | null) => {
      if (!next) return
      setPreferenceError("")
      setSortDirection(next.direction)
      if (pageValue !== 1) setPageValue(1)
      persistPreferences({
        isAscendingSort: next.direction === "asc",
        groupField: groupFieldNormalized,
        filters,
      })
    },
    [filters, groupFieldNormalized, pageValue, persistPreferences, setPageValue, setSortDirection],
  )

  const onGroupFieldChange = useCallback(
    (next: string | null) => {
      setPreferenceError("")
      if (next) {
        setGroupedToggle("1")
        setGroupFieldValue(next)
      } else {
        setGroupedToggle("0")
        setGroupFieldValue(null)
      }
      if (pageValue !== 1) setPageValue(1)
      persistPreferences({
        isAscendingSort,
        groupField: next ? next : null,
        filters,
      })
    },
    [filters, isAscendingSort, pageValue, persistPreferences, setGroupFieldValue, setGroupedToggle, setPageValue],
  )

  const onFilterChange = useCallback(
    (key: string, values: string[]) => {
      setPreferenceError("")
      setFilters((prev) => {
        const next: ListFilterValueMap = { ...prev, [key]: [...values] }
        writeFiltersUrl(next)
        persistPreferences({
          isAscendingSort,
          groupField: groupFieldNormalized,
          filters: next,
        })
        return next
      })
      if (pageValue !== 1) setPageValue(1)
    },
    [
      groupFieldNormalized,
      isAscendingSort,
      pageValue,
      persistPreferences,
      setPageValue,
      writeFiltersUrl,
    ],
  )

  const onClearAllFilters = useCallback(() => {
    if (!filterableFields || filterableFields.length === 0) return
    setPreferenceError("")
    setFilters(() => {
      const next: ListFilterValueMap = {}
      for (const key of filterableFields) next[key] = []
      writeFiltersUrl(next)
      persistPreferences({
        isAscendingSort,
        groupField: groupFieldNormalized,
        filters: next,
      })
      return next
    })
    if (pageValue !== 1) setPageValue(1)
  }, [
    filterableFields,
    groupFieldNormalized,
    isAscendingSort,
    pageValue,
    persistPreferences,
    setPageValue,
    writeFiltersUrl,
  ])

  const goToPage = useCallback(
    (next: number) => {
      const safe = Math.max(1, Math.floor(next))
      setPageValue(safe === 1 ? null : safe)
    },
    [setPageValue],
  )

  const goToPreviousPage = useCallback(() => {
    if (hasPreviousPage) goToPage(pageValue - 1)
  }, [goToPage, hasPreviousPage, pageValue])

  const goToNextPage = useCallback(() => {
    if (hasNextPage) goToPage(pageValue + 1)
  }, [goToPage, hasNextPage, pageValue])

  return {
    rows,
    total,
    groups,

    searchQuery: searchInputValue,
    sort: sortFieldKey ? { field: sortFieldKey, direction: sortDirection } : null,
    groupField: groupFieldNormalized,
    filters,
    page: pageValue,
    pageSize,
    totalPages,

    onSearchQueryChange,
    onSortChange,
    onToggleSortDirection,
    onGroupFieldChange,
    onFilterChange,
    onClearAllFilters,

    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    goToPage,
    previousPageHref: undefined,
    nextPageHref: undefined,

    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error,
    refetch: () => {
      queryResult.refetch()
    },

    preferenceError,
  }
}
