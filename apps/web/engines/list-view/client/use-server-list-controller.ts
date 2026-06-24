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

// Multi-column sort URL codec. The ordered list is encoded as a single
// `?sorts=field:dir,field:dir` param (highest priority first). Only consumers
// that opt into multi-sort (`maxSortLevels > 1`) ever read/write it.
function encodeSorts(sorts: ListSort[]): string {
  return sorts.map((entry) => `${entry.field}:${entry.direction}`).join(",")
}

function parseSorts(
  raw: string,
  allowedSortFields: readonly string[] | undefined,
  maxSortLevels: number,
): ListSort[] {
  if (!raw) return []
  const result: ListSort[] = []
  const seen = new Set<string>()
  for (const token of raw.split(",")) {
    const [field, directionRaw] = token.split(":")
    if (!field || seen.has(field)) continue
    if (allowedSortFields && !allowedSortFields.includes(field)) continue
    seen.add(field)
    result.push({ field, direction: directionRaw === "asc" ? "asc" : "desc" })
    if (result.length >= maxSortLevels) break
  }
  return result
}

/** Validate + de-dupe + cap an arbitrary sort list against a consumer's rules. */
function normalizeSorts(
  next: ListSort[],
  allowedSortFields: readonly string[] | undefined,
  maxSortLevels: number,
): ListSort[] {
  const result: ListSort[] = []
  const seen = new Set<string>()
  for (const entry of next) {
    if (seen.has(entry.field)) continue
    if (allowedSortFields && !allowedSortFields.includes(entry.field)) continue
    seen.add(entry.field)
    result.push({ field: entry.field, direction: entry.direction === "asc" ? "asc" : "desc" })
    if (result.length >= maxSortLevels) break
  }
  return result
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
  const sortFieldKey = initialSort?.field ?? input.allowedSortFields?.[0] ?? ""
  const filterableFields = input.filterableFields
  const urlSyncMode = input.urlSyncMode ?? "history"
  const initialFiltersMap = useMemo(
    () => normalizeInitialFilters(input.initialFilters, filterableFields),
    [filterableFields, input.initialFilters],
  )

  const [searchQuery, setSearchQuery] = useState(input.initialSearchQuery ?? "")
  const [isAscendingSort, setIsAscendingSort] = useState(initialIsAscendingSort)
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
      writeUrl({ searchQuery, isAscendingSort, filters })
      lastSyncedSearchQueryRef.current = searchQuery
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchQuery, isAscendingSort, filters, writeUrl])

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
      writeUrl({ searchQuery, isAscendingSort: next, filters })
      return next
    })
  }, [filters, searchQuery, writeUrl])

  const onSortChange = useCallback(
    (next: ListSort | null) => {
      if (!next) return
      const nextAsc = next.direction === "asc"
      setIsAscendingSort(nextAsc)
      writeUrl({ searchQuery, isAscendingSort: nextAsc, filters })
    },
    [filters, searchQuery, writeUrl],
  )

  const onFilterChange = useCallback(
    (key: string, values: string[]) => {
      setFilters((prev) => {
        const next: ListFilterValueMap = { ...prev, [key]: [...values] }
        writeUrl({ searchQuery, isAscendingSort, filters: next })
        return next
      })
    },
    [isAscendingSort, searchQuery, writeUrl],
  )

  const onClearAllFilters = useCallback(() => {
    if (!filterableFields || filterableFields.length === 0) return
    const next: ListFilterValueMap = {}
    for (const key of filterableFields) next[key] = []
    setFilters(next)
    writeUrl({ searchQuery, isAscendingSort, filters: next })
  }, [filterableFields, isAscendingSort, searchQuery, writeUrl])

  // SSR controller is single-sort only; expose the multi-sort surface as a
  // pass-through for contract parity (degrades to replacing the single sort).
  const onSortsChange = useCallback(
    (next: ListSort[]) => {
      if (next.length > 0) onSortChange(next[0])
    },
    [onSortChange],
  )

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

    searchQuery,
    sort: sortFieldKey ? { field: sortFieldKey, direction: isAscendingSort ? "asc" : "desc" } : null,
    sorts: sortFieldKey
      ? [{ field: sortFieldKey, direction: isAscendingSort ? "asc" : "desc" }]
      : [],
    filters,
    page,
    pageSize,
    totalPages,

    onSearchQueryChange,
    onSortChange,
    onToggleSortDirection,
    onSortsChange,
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
  const initialPageValue = input.initialPage ?? 1
  const initialFieldKey = input.initialSort?.field ?? input.allowedSortFields?.[0] ?? ""
  // Opt-in multi-column sort. `1` (default) keeps the single-sort behavior +
  // URL byte-identical; `> 1` activates the ordered `?sorts=` param path.
  const maxSortLevels = Math.max(1, Math.floor(input.maxSortLevels ?? 1))
  const multiSort = maxSortLevels > 1
  const allowedSortFields = input.allowedSortFields
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
  // URL-bound sort field. Consumers that don't pass a multi-field
  // `allowedSortFields` always fall back to `initialFieldKey`, so the param is
  // inert for them (never read off the default, never written).
  const [sortFieldValue, setSortFieldValue] = useQueryState(
    "sortField",
    parseAsString.withDefault(initialFieldKey),
  )
  const sortFieldKey = input.allowedSortFields?.includes(sortFieldValue)
    ? sortFieldValue
    : initialFieldKey
  // Ordered multi-sort param. Inert for single-sort consumers — they never set
  // it, so it stays out of the URL (nuqs only writes a non-default value).
  const [sortsParam, setSortsParam] = useQueryState("sorts", parseAsString.withDefault(""))
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

  // Canonical ordered sort list. In multi-sort mode it is driven by the `sorts`
  // param (falling back to `initialSort`); otherwise it mirrors the single
  // `sortField`/`sort` params as an array of zero or one. Memoized on primitives
  // so its identity (and the query key) stays stable across renders.
  const sorts: ListSort[] = useMemo(() => {
    if (multiSort) {
      const parsed = parseSorts(sortsParam, allowedSortFields, maxSortLevels)
      if (parsed.length > 0) return parsed
      return initialFieldKey ? [{ field: initialFieldKey, direction: initialDirection }] : []
    }
    return sortFieldKey ? [{ field: sortFieldKey, direction: sortDirection }] : []
  }, [
    multiSort,
    sortsParam,
    allowedSortFields,
    maxSortLevels,
    initialFieldKey,
    initialDirection,
    sortFieldKey,
    sortDirection,
  ])

  const listInput: ListInput<TFilters> = useMemo(
    () => ({
      search: searchUrlValue?.trim() ? searchUrlValue.trim() : undefined,
      sort: sorts[0],
      ...(multiSort ? { sorts } : {}),
      filters: asTypedFilters<TFilters>(filters),
      page: pageValue,
      pageSize: declaredPageSize,
    }),
    [declaredPageSize, filters, multiSort, pageValue, searchUrlValue, sorts],
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
    if (multiSort) {
      // Flip the primary (highest-priority) column; keep the rest of the chain.
      const current = parseSorts(sortsParam, allowedSortFields, maxSortLevels)
      const base =
        current.length > 0
          ? current
          : initialFieldKey
            ? [{ field: initialFieldKey, direction: initialDirection }]
            : []
      if (base.length === 0) return
      const flipped: ListSort[] = [
        { field: base[0].field, direction: base[0].direction === "asc" ? "desc" : "asc" },
        ...base.slice(1),
      ]
      setSortsParam(encodeSorts(flipped))
      if (pageValue !== 1) setPageValue(1)
      return
    }
    const nextDirection: "asc" | "desc" = sortDirection === "asc" ? "desc" : "asc"
    setSortDirection(nextDirection)
    if (pageValue !== 1) setPageValue(1)
  }, [
    allowedSortFields,
    initialDirection,
    initialFieldKey,
    maxSortLevels,
    multiSort,
    pageValue,
    setPageValue,
    setSortDirection,
    setSortsParam,
    sortDirection,
    sortsParam,
  ])

  const onSortChange = useCallback(
    (next: ListSort | null) => {
      if (!next) return
      // Header-click path = replace with this single column.
      if (multiSort) {
        if (allowedSortFields && !allowedSortFields.includes(next.field)) return
        setSortsParam(encodeSorts([{ field: next.field, direction: next.direction }]))
        if (pageValue !== 1) setPageValue(1)
        return
      }
      if (next.field && allowedSortFields?.includes(next.field)) {
        // Clear the param when it returns to the default field.
        setSortFieldValue(next.field === initialFieldKey ? null : next.field)
      }
      setSortDirection(next.direction)
      if (pageValue !== 1) setPageValue(1)
    },
    [allowedSortFields, initialFieldKey, multiSort, pageValue, setPageValue, setSortDirection, setSortFieldValue, setSortsParam],
  )

  const onSortsChange = useCallback(
    (next: ListSort[]) => {
      // Multi-sort menu path = set the full ordered list. On single-sort lists
      // it degrades to replacing with the first entry.
      if (!multiSort) {
        if (next.length > 0) onSortChange(next[0])
        return
      }
      const cleaned = normalizeSorts(next, allowedSortFields, maxSortLevels)
      setSortsParam(cleaned.length > 0 ? encodeSorts(cleaned) : null)
      if (pageValue !== 1) setPageValue(1)
    },
    [allowedSortFields, maxSortLevels, multiSort, onSortChange, pageValue, setPageValue, setSortsParam],
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

    searchQuery: searchInputValue,
    sort: sorts[0] ?? null,
    sorts,
    filters,
    page: pageValue,
    pageSize,
    totalPages,

    onSearchQueryChange,
    onSortChange,
    onToggleSortDirection,
    onSortsChange,
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
