"use client"

import { useQuery } from "@tanstack/react-query"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryState } from "nuqs"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ListInput, ListSort } from "@builders/application"
import type {
  ListControllerFetchInput,
  ListControllerSsrInput,
} from "./contracts/list-controller-input"
import type {
  ListControllerOutput,
  ListFilterValueMap,
} from "./contracts/list-controller-output"

const SEARCH_DEBOUNCE_MS = 300

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

// NOTE: the `useServerListController` dispatcher was removed (it branched on
// input.mode between two hooks — a rules-of-hooks violation). Every consumer
// runs `mode: "fetch"`, so they call `useFetchListController` directly.
// `useSsrListController` is retained, exported, and currently unused — its full
// removal (with `ListControllerSsrInput` + the `mode` discriminant) is a
// follow-up beyond this lint sweep.
export function useSsrListController<TRow, TFilters>(
  input: ListControllerSsrInput<TRow, TFilters>,
): ListControllerOutput<TRow> {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialSort = input.initialSort ?? null
  const initialIsAscendingSort = initialSort ? initialSort.direction !== "desc" : true
  const initialGroupField = input.initialGroupField ?? null
  const sortFieldKey = initialSort?.field ?? input.allowedSortFields?.[0] ?? ""
  const filterableFields = input.filterableFields
  const urlSyncMode = input.urlSyncMode ?? "history"
  const initialFiltersMap = useMemo(
    () => normalizeInitialFilters(input.initialFilters, filterableFields),
    [filterableFields, input.initialFilters],
  )

  const [searchQuery, setSearchQuery] = useState(input.initialSearchQuery ?? "")
  const [isAscendingSort, setIsAscendingSort] = useState(initialIsAscendingSort)
  const [groupField, setGroupField] = useState<string | null>(initialGroupField)
  const [filters, setFilters] = useState<ListFilterValueMap>(initialFiltersMap)

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
    setIsAscendingSort((prev) => {
      const next = !prev
      writeUrl({ searchQuery, isAscendingSort: next, groupField, filters })
      return next
    })
  }, [filters, groupField, searchQuery, writeUrl])

  const onSortChange = useCallback(
    (next: ListSort | null) => {
      if (!next) return
      const nextAsc = next.direction === "asc"
      setIsAscendingSort(nextAsc)
      writeUrl({ searchQuery, isAscendingSort: nextAsc, groupField, filters })
    },
    [filters, groupField, searchQuery, writeUrl],
  )

  const onGroupFieldChange = useCallback(
    (next: string | null) => {
      setGroupField(next)
      writeUrl({ searchQuery, isAscendingSort, groupField: next, filters })
    },
    [filters, isAscendingSort, searchQuery, writeUrl],
  )

  const onFilterChange = useCallback(
    (key: string, values: string[]) => {
      setFilters((prev) => {
        const next: ListFilterValueMap = { ...prev, [key]: [...values] }
        writeUrl({ searchQuery, isAscendingSort, groupField, filters: next })
        return next
      })
    },
    [groupField, isAscendingSort, searchQuery, writeUrl],
  )

  const onClearAllFilters = useCallback(() => {
    if (!filterableFields || filterableFields.length === 0) return
    const next: ListFilterValueMap = {}
    for (const key of filterableFields) next[key] = []
    setFilters(next)
    writeUrl({ searchQuery, isAscendingSort, groupField, filters: next })
  }, [filterableFields, groupField, isAscendingSort, searchQuery, writeUrl])

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
  }
}

export function useFetchListController<TRow, TFilters>(
  input: ListControllerFetchInput<TRow, TFilters>,
): ListControllerOutput<TRow> {
  const searchParams = useSearchParams()

  const initialSearchQuery = input.initialSearchQuery ?? ""
  const initialDirection = input.initialSort?.direction ?? "asc"
  const initialGroupValue = input.initialGroupField ?? ""
  const initialGroupedToggle: "0" | "1" = input.initialGroupField ? "1" : "0"
  const initialPageValue = input.initialPage ?? 1
  const sortFieldKey = input.initialSort?.field ?? input.allowedSortFields?.[0] ?? ""
  const filterableFields = input.filterableFields
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

  const isGroupingEnabled = groupedToggle === "1"
  const groupFieldNormalized: string | null = isGroupingEnabled && groupFieldValue ? groupFieldValue : null

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
    const nextDirection: "asc" | "desc" = sortDirection === "asc" ? "desc" : "asc"
    setSortDirection(nextDirection)
    if (pageValue !== 1) setPageValue(1)
  }, [pageValue, setPageValue, setSortDirection, sortDirection])

  const onSortChange = useCallback(
    (next: ListSort | null) => {
      if (!next) return
      setSortDirection(next.direction)
      if (pageValue !== 1) setPageValue(1)
    },
    [pageValue, setPageValue, setSortDirection],
  )

  const onGroupFieldChange = useCallback(
    (next: string | null) => {
      if (next) {
        setGroupedToggle("1")
        setGroupFieldValue(next)
      } else {
        setGroupedToggle("0")
        setGroupFieldValue(null)
      }
      if (pageValue !== 1) setPageValue(1)
    },
    [pageValue, setGroupFieldValue, setGroupedToggle, setPageValue],
  )

  const onFilterChange = useCallback(
    (key: string, values: string[]) => {
      setFilters((prev) => {
        const next: ListFilterValueMap = { ...prev, [key]: [...values] }
        writeFiltersUrl(next)
        return next
      })
      if (pageValue !== 1) setPageValue(1)
    },
    [pageValue, setPageValue, writeFiltersUrl],
  )

  const onClearAllFilters = useCallback(() => {
    if (!filterableFields || filterableFields.length === 0) return
    setFilters(() => {
      const next: ListFilterValueMap = {}
      for (const key of filterableFields) next[key] = []
      writeFiltersUrl(next)
      return next
    })
    if (pageValue !== 1) setPageValue(1)
  }, [filterableFields, pageValue, setPageValue, writeFiltersUrl])

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
  }
}
