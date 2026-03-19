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

  if (groupByKeys.length > 0) {
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
}: ServerTableQueryState & {
  setSearchQuery: (value: string) => void
  setIsAscendingSort: (value: boolean | ((current: boolean) => boolean)) => void
  setIsGroupingEnabled: (value: boolean | ((current: boolean) => boolean)) => void
  setGroupByKeys: (value: string[]) => void
  groupOptions: GroupOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSearchQueryRef = useRef(searchQuery)
  const stableGroupOptions = useMemo(() => groupOptions.map((option) => option.key), [groupOptions])

  const replaceUrl = useCallback((nextState: ServerTableQueryState) => {
    if (!pathname) return
    const nextSearchParams = buildNextSearchParams({
      currentSearchParams: new URLSearchParams(searchParams?.toString() ?? ""),
      ...nextState,
    })
    const nextQueryString = nextSearchParams.toString()
    router.replace(nextQueryString ? `${pathname}?${nextQueryString}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

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
    },
    onToggleGrouping: () => {
      const nextIsGroupingEnabled = !isGroupingEnabled
      setIsGroupingEnabled(nextIsGroupingEnabled)
      replaceUrl({
        searchQuery,
        isAscendingSort,
        isGroupingEnabled: nextIsGroupingEnabled,
        groupByKeys,
      })
    },
    onGroupByKeyAtIndexChange: (index: number, nextKey: string) => {
      const nextGroupByKeys = [...groupByKeys]
      nextGroupByKeys[index] = nextKey
      const dedupedGroupByKeys = nextGroupByKeys.filter((key, keyIndex) => key && nextGroupByKeys.indexOf(key) === keyIndex).slice(0, 3)
      setGroupByKeys(dedupedGroupByKeys)
      replaceUrl({
        searchQuery,
        isAscendingSort,
        isGroupingEnabled: true,
        groupByKeys: dedupedGroupByKeys,
      })
    },
    onAddGroupBy: () => {
      const nextKey = stableGroupOptions.find((key) => !groupByKeys.includes(key))
      if (!nextKey) return
      const nextGroupByKeys = [...groupByKeys, nextKey].slice(0, 3)
      setGroupByKeys(nextGroupByKeys)
      setIsGroupingEnabled(true)
      replaceUrl({
        searchQuery,
        isAscendingSort,
        isGroupingEnabled: true,
        groupByKeys: nextGroupByKeys,
      })
    },
    onRemoveGroupBy: (index: number) => {
      const nextGroupByKeys = groupByKeys.filter((_, keyIndex) => keyIndex !== index)
      const nextIsGroupingEnabled = nextGroupByKeys.length > 0 ? isGroupingEnabled : false
      setGroupByKeys(nextGroupByKeys)
      setIsGroupingEnabled(nextIsGroupingEnabled)
      replaceUrl({
        searchQuery,
        isAscendingSort,
        isGroupingEnabled: nextIsGroupingEnabled,
        groupByKeys: nextGroupByKeys,
      })
    },
  }
}
