"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef } from "react"

type ServerTableQueryState = {
  searchQuery: string
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
}

type GroupOption = {
  key: string
  label: string
}

function buildNextSearchParams({
  currentSearchParams,
  searchQuery,
  isAscendingSort,
  isGroupingEnabled,
  groupByKeys,
}: {
  currentSearchParams: URLSearchParams
  searchQuery: string
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
}) {
  const nextSearchParams = new URLSearchParams(currentSearchParams)
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

export function useServerTableQueryControls({
  searchQuery,
  setSearchQuery,
  isAscendingSort,
  setIsAscendingSort,
  isGroupingEnabled,
  setIsGroupingEnabled,
  groupByKeys,
  setGroupByKeys,
  groupOptions,
  filters = {},
  allowedFilterValues = {},
  onPersistState,
}: ServerTableQueryState & {
  setSearchQuery: (value: string) => void
  setIsAscendingSort: (value: boolean | ((current: boolean) => boolean)) => void
  setIsGroupingEnabled: (value: boolean | ((current: boolean) => boolean)) => void
  setGroupByKeys: (value: string[]) => void
  groupOptions: GroupOption[]
  filters?: Record<string, string>
  allowedFilterValues?: Record<string, string[]>
  onPersistState?: (nextState: {
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    groupByKeys: string[]
    filters: Record<string, string>
    allowedGroupKeys: string[]
    allowedFilterValues: Record<string, string[]>
  }) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSearchQueryRef = useRef(searchQuery)
  const stableGroupOptions = useMemo(() => groupOptions.map((option) => option.key), [groupOptions])
  const getCurrentSearchParams = useCallback(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search)
    }
    return new URLSearchParams(searchParams?.toString() ?? "")
  }, [searchParams])

  const replaceUrl = useCallback((nextState: ServerTableQueryState) => {
    if (!pathname) return
    const nextSearchParams = buildNextSearchParams({
      currentSearchParams: getCurrentSearchParams(),
      ...nextState,
    })
    const nextQueryString = nextSearchParams.toString()
    router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, { scroll: false })
  }, [getCurrentSearchParams, pathname, router])

  const replaceBrowserUrl = useCallback((nextState: ServerTableQueryState) => {
    if (!pathname || typeof window === "undefined") return
    const nextSearchParams = buildNextSearchParams({
      currentSearchParams: getCurrentSearchParams(),
      ...nextState,
    })
    const nextQueryString = nextSearchParams.toString()
    window.history.replaceState(window.history.state, "", nextQueryString ? `${pathname}?${nextQueryString}` : pathname)
  }, [getCurrentSearchParams, pathname])

  useEffect(() => {
    if (lastSearchQueryRef.current === searchQuery) {
      return
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      replaceUrl({
        searchQuery,
        isAscendingSort,
        isGroupingEnabled,
        groupByKeys,
      })
      lastSearchQueryRef.current = searchQuery
    }, 250)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [groupByKeys, isAscendingSort, isGroupingEnabled, replaceUrl, searchQuery])

  return {
    onSearchQueryChange: (value: string) => {
      setSearchQuery(value)
    },
    onToggleSort: () => {
      const nextIsAscendingSort = !isAscendingSort
      setIsAscendingSort(nextIsAscendingSort)
      replaceUrl({
        searchQuery,
        isAscendingSort: nextIsAscendingSort,
        isGroupingEnabled,
        groupByKeys,
      })
      onPersistState?.({
        isAscendingSort: nextIsAscendingSort,
        isGroupingEnabled,
        groupByKeys,
        filters,
        allowedGroupKeys: stableGroupOptions,
        allowedFilterValues,
      })
    },
    onToggleGroupByKey: (columnKey: string) => {
      if (!stableGroupOptions.includes(columnKey)) return

      const activeGroupByKeys = (isGroupingEnabled ? groupByKeys : []).filter((key, index, keys) => {
        return Boolean(key) && keys.indexOf(key) === index && stableGroupOptions.includes(key)
      })

      const existingIndex = activeGroupByKeys.indexOf(columnKey)
      const nextGroupByKeys = existingIndex >= 0
        ? activeGroupByKeys.slice(0, existingIndex)
        : activeGroupByKeys.length >= 3
          ? activeGroupByKeys
          : [...activeGroupByKeys, columnKey]
      const nextIsGroupingEnabled = nextGroupByKeys.length > 0

      setGroupByKeys(nextGroupByKeys)
      setIsGroupingEnabled(nextIsGroupingEnabled)
      replaceBrowserUrl({
        searchQuery,
        isAscendingSort,
        isGroupingEnabled: nextIsGroupingEnabled,
        groupByKeys: nextGroupByKeys,
      })
      onPersistState?.({
        isAscendingSort,
        isGroupingEnabled: nextIsGroupingEnabled,
        groupByKeys: nextGroupByKeys,
        filters,
        allowedGroupKeys: stableGroupOptions,
        allowedFilterValues,
      })
    },
  }
}
