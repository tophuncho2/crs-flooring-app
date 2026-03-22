"use client"

import { useMemo, useState } from "react"

export type TableValueGetter<T> = (row: T) => string | null | undefined

export type SearchField<T> = {
  key: string
  getValue: TableValueGetter<T>
}

export type GroupField<T> = {
  key: string
  label: string
  getValue: TableValueGetter<T>
}

export type GroupedRowTree<T> = {
  depth: number
  key: string
  fieldKey: string
  fieldLabel: string
  label: string
  rows: T[]
  children: GroupedRowTree<T>[]
}

export const MAX_GROUP_FIELDS = 3
export const DEFAULT_TABLE_PAGE_SIZE = 50

type UseTableControlsOptions<T> = {
  rows: T[]
  searchFields: SearchField<T>[]
  sortField: TableValueGetter<T>
  groupFields?: GroupField<T>[]
  initialSearchQuery?: string
  defaultGrouped?: boolean
  defaultGroupKey?: string | null
  defaultGroupKeys?: string[]
  defaultAscending?: boolean
  maxGroupFields?: number
  pageSize?: number
  disableClientFiltering?: boolean
  disableClientSorting?: boolean
  disableClientPagination?: boolean
}

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
})

function normalizeValue(value: string | null | undefined) {
  return String(value ?? "").trim()
}

export function useTableControls<T>({
  rows,
  searchFields,
  sortField,
  groupFields = [],
  initialSearchQuery = "",
  defaultGrouped = false,
  defaultGroupKey = null,
  defaultGroupKeys,
  defaultAscending = true,
  maxGroupFields = MAX_GROUP_FIELDS,
  pageSize = DEFAULT_TABLE_PAGE_SIZE,
  disableClientFiltering = false,
  disableClientSorting = false,
  disableClientPagination = false,
}: UseTableControlsOptions<T>) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
  const [isAscendingSort, setIsAscendingSort] = useState(defaultAscending)
  const [isGroupingEnabled, setIsGroupingEnabled] = useState(defaultGrouped && groupFields.length > 0)
  const initialGroupKeys = useMemo(() => {
    const requestedKeys = defaultGroupKeys?.length ? defaultGroupKeys : [defaultGroupKey ?? groupFields[0]?.key ?? null]
    const nextKeys: string[] = []
    for (const key of requestedKeys) {
      if (!key) continue
      if (!groupFields.some((field) => field.key === key)) continue
      if (nextKeys.includes(key)) continue
      nextKeys.push(key)
      if (nextKeys.length >= maxGroupFields) break
    }
    if (nextKeys.length === 0 && groupFields[0]) {
      nextKeys.push(groupFields[0].key)
    }
    return nextKeys
  }, [defaultGroupKey, defaultGroupKeys, groupFields, maxGroupFields])
  const [groupByKeys, setGroupByKeys] = useState<string[]>(initialGroupKeys)
  const [pageState, setPageState] = useState(1)

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const activeGroupFields = groupByKeys
    .map((key) => groupFields.find((field) => field.key === key) ?? null)
    .filter((field): field is GroupField<T> => Boolean(field))
    .slice(0, maxGroupFields)
  const activeGroupField = activeGroupFields[0] ?? groupFields[0] ?? null

  const filteredRows = useMemo(
    () => {
      if (disableClientFiltering) {
        return rows
      }

      return rows.filter((row) => {
        if (!normalizedSearchQuery) return true
        return searchFields.some((field) => normalizeValue(field.getValue(row)).toLowerCase().includes(normalizedSearchQuery))
      })
    },
    [disableClientFiltering, rows, searchFields, normalizedSearchQuery],
  )

  const allSortedRows = useMemo(
    () => {
      if (disableClientSorting) {
        return filteredRows
      }

      return [...filteredRows].sort((a, b) => {
        const comparison = collator.compare(normalizeValue(sortField(a)), normalizeValue(sortField(b)))
        return isAscendingSort ? comparison : -comparison
      })
    },
    [disableClientSorting, filteredRows, sortField, isAscendingSort],
  )

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage = Math.min(pageState, totalPages)
  const pageStart = (safePage - 1) * pageSize
  const pageEnd = pageStart + pageSize

  const sortedRows = useMemo(
    () => (disableClientPagination ? allSortedRows : allSortedRows.slice(pageStart, pageEnd)),
    [allSortedRows, disableClientPagination, pageEnd, pageStart],
  )

  const groupedRows = useMemo(() => {
    if (!isGroupingEnabled || !activeGroupField) return []

    const groups = new Map<string, T[]>()
    for (const row of sortedRows) {
      const groupValue = normalizeValue(activeGroupField.getValue(row)) || "Ungrouped"
      const existing = groups.get(groupValue) ?? []
      existing.push(row)
      groups.set(groupValue, existing)
    }

    return Array.from(groups.entries()).sort((a, b) => (isAscendingSort ? collator.compare(a[0], b[0]) : collator.compare(b[0], a[0])))
  }, [sortedRows, isGroupingEnabled, activeGroupField, isAscendingSort])

  const groupedRowTree = useMemo(() => {
    if (!isGroupingEnabled || activeGroupFields.length === 0) return []

    const buildTree = (treeRows: T[], depth: number): GroupedRowTree<T>[] => {
      const field = activeGroupFields[depth]
      if (!field) return []

      const groups = new Map<string, T[]>()
      for (const row of treeRows) {
        const groupValue = normalizeValue(field.getValue(row)) || "Ungrouped"
        const existing = groups.get(groupValue) ?? []
        existing.push(row)
        groups.set(groupValue, existing)
      }

      return Array.from(groups.entries())
        .sort((a, b) => (isAscendingSort ? collator.compare(a[0], b[0]) : collator.compare(b[0], a[0])))
        .map(([label, groupRows]) => ({
          depth,
          key: `${field.key}:${label}`,
          fieldKey: field.key,
          fieldLabel: field.label,
          label,
          rows: groupRows,
          children: buildTree(groupRows, depth + 1),
        }))
    }

    return buildTree(sortedRows, 0)
  }, [sortedRows, isGroupingEnabled, activeGroupFields, isAscendingSort])

  const setGroupByKey = (value: string | null) => {
    if (!value) {
      setGroupByKeys([])
      setIsGroupingEnabled(false)
      return
    }
    setGroupByKeys([value])
    setIsGroupingEnabled(true)
  }

  const updateGroupByKeyAtIndex = (index: number, nextKey: string) => {
    setGroupByKeys((previous) => {
      const next = [...previous]
      next[index] = nextKey
      const deduped = next.filter((key, keyIndex) => key && next.indexOf(key) === keyIndex)
      return deduped.slice(0, maxGroupFields)
    })
  }

  const addGroupByKey = () => {
    setGroupByKeys((previous) => {
      if (previous.length >= maxGroupFields) return previous
      const nextField = groupFields.find((field) => !previous.includes(field.key))
      if (!nextField) return previous
      return [...previous, nextField.key]
    })
  }

  const removeGroupByKeyAtIndex = (index: number) => {
    const nextGroupByKeys = groupByKeys.slice(0, index)
    setGroupByKeys(nextGroupByKeys)
    setIsGroupingEnabled(nextGroupByKeys.length > 0)
  }

  const toggleGroupByKey = (nextKey: string) => {
    if (!groupFields.some((field) => field.key === nextKey)) return

    const activeGroupKeys = (isGroupingEnabled ? groupByKeys : []).filter((key, index, keys) => {
      return Boolean(key) && keys.indexOf(key) === index && groupFields.some((field) => field.key === key)
    })

    const existingIndex = activeGroupKeys.indexOf(nextKey)
    const nextGroupByKeys = existingIndex >= 0
      ? activeGroupKeys.slice(0, existingIndex)
      : activeGroupKeys.length >= maxGroupFields
        ? activeGroupKeys
        : [...activeGroupKeys, nextKey]

    setGroupByKeys(nextGroupByKeys)
    setIsGroupingEnabled(nextGroupByKeys.length > 0)
  }

  const hasPreviousPage = safePage > 1
  const hasNextPage = safePage < totalPages

  const goToPreviousPage = () => {
    setPageState((current) => Math.max(1, current - 1))
  }

  const goToNextPage = () => {
    setPageState((current) => Math.min(totalPages, current + 1))
  }

  const resetPage = () => {
    setPageState(1)
  }

  return {
    searchQuery,
    setSearchQuery: (value: string) => {
      resetPage()
      setSearchQuery(value)
    },
    isAscendingSort,
    setIsAscendingSort: (value: boolean | ((current: boolean) => boolean)) => {
      resetPage()
      setIsAscendingSort(value)
    },
    isGroupingEnabled,
    setIsGroupingEnabled: (value: boolean | ((current: boolean) => boolean)) => {
      resetPage()
      setIsGroupingEnabled(value)
    },
    groupByKey: groupByKeys[0] ?? null,
    setGroupByKey,
    groupByKeys,
    setGroupByKeys,
    updateGroupByKeyAtIndex,
    addGroupByKey,
    removeGroupByKeyAtIndex,
    toggleGroupByKey,
    groupFields,
    filteredRows,
    sortedRows,
    allSortedRows,
    groupedRows,
    groupedRowTree,
    page: safePage,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    setPage: (value: number | ((current: number) => number)) => {
      setPageState((current) => {
        const nextValue = typeof value === "function" ? value(current) : value
        return Math.min(totalPages, Math.max(1, nextValue))
      })
    },
  }
}
