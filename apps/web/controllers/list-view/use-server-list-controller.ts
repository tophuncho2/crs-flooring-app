"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import type { ListSort } from "@builders/application"
import type { TablePreferencePayload } from "@builders/domain"
import type { ListControllerInput } from "./contracts/list-controller-input"
import type { ListControllerOutput } from "./contracts/list-controller-output"
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

function buildNextSearchParams(
  current: URLSearchParams,
  next: { searchQuery: string; isAscendingSort: boolean; groupField: string | null },
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

  return params
}

export function useServerListController<TRow, TFilters = Record<string, never>>(
  input: ListControllerInput<TRow, TFilters>,
): ListControllerOutput<TRow> {
  if (input.mode === "fetch") {
    throw new Error("useServerListController: 'fetch' mode lands in PR 3")
  }

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialSort = input.initialSort ?? null
  const initialIsAscendingSort = initialSort ? initialSort.direction !== "desc" : true
  const initialGroupField = input.initialGroupField ?? null
  const sortFieldKey = initialSort?.field ?? input.allowedSortFields?.[0] ?? ""
  const allowedGroupFields = input.allowedGroupFields
  const allowedSortFields = input.allowedSortFields
  const tableKey = input.tableKey
  const initialTablePreferences = input.initialTablePreferences ?? null
  const urlSyncMode = input.urlSyncMode ?? "history"

  const [searchQuery, setSearchQuery] = useState(input.initialSearchQuery ?? "")
  const [isAscendingSort, setIsAscendingSort] = useState(initialIsAscendingSort)
  const [groupField, setGroupField] = useState<string | null>(initialGroupField)
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
    (next: { searchQuery: string; isAscendingSort: boolean; groupField: string | null }) => {
      if (!pathname) return
      const params = buildNextSearchParams(getCurrentParams(), next)
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
    [getCurrentParams, pathname, router, urlSyncMode],
  )

  const persistPreferences = useCallback(
    (next: { isAscendingSort: boolean; groupField: string | null }) => {
      if (!tableKey || !sortFieldKey) return

      const payload: TablePreferencePayload = {
        sort: { key: sortFieldKey, direction: next.isAscendingSort ? "asc" : "desc" },
        filters: initialTablePreferences?.filters ?? {},
        columnVisibility: initialTablePreferences?.columnVisibility ?? {},
        columnOrder: initialTablePreferences?.columnOrder ?? [],
        grouping: {
          enabled: next.groupField !== null,
          keys: next.groupField ? [next.groupField] : [],
        },
      }

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
      writeUrl({ searchQuery, isAscendingSort, groupField })
      lastSyncedSearchQueryRef.current = searchQuery
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchQuery, isAscendingSort, groupField, writeUrl])

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
      writeUrl({ searchQuery, isAscendingSort: next, groupField })
      persistPreferences({ isAscendingSort: next, groupField })
      return next
    })
  }, [groupField, persistPreferences, searchQuery, writeUrl])

  const onSortChange = useCallback(
    (next: ListSort | null) => {
      if (!next) return
      setPreferenceError("")
      const nextAsc = next.direction === "asc"
      setIsAscendingSort(nextAsc)
      writeUrl({ searchQuery, isAscendingSort: nextAsc, groupField })
      persistPreferences({ isAscendingSort: nextAsc, groupField })
    },
    [groupField, persistPreferences, searchQuery, writeUrl],
  )

  const onGroupFieldChange = useCallback(
    (next: string | null) => {
      setPreferenceError("")
      setGroupField(next)
      writeUrl({ searchQuery, isAscendingSort, groupField: next })
      persistPreferences({ isAscendingSort, groupField: next })
    },
    [isAscendingSort, persistPreferences, searchQuery, writeUrl],
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
    groups: input.initialGroups,

    searchQuery,
    sort: sortFieldKey ? { field: sortFieldKey, direction: isAscendingSort ? "asc" : "desc" } : null,
    groupField,
    page,
    pageSize,
    totalPages,

    onSearchQueryChange,
    onSortChange,
    onToggleSortDirection,
    onGroupFieldChange,

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
