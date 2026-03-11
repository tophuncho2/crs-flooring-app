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

type UseTableControlsOptions<T> = {
  rows: T[]
  searchFields: SearchField<T>[]
  sortField: TableValueGetter<T>
  groupFields?: GroupField<T>[]
  defaultGrouped?: boolean
  defaultGroupKey?: string | null
  defaultAscending?: boolean
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
  defaultGrouped = false,
  defaultGroupKey = null,
  defaultAscending = true,
}: UseTableControlsOptions<T>) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAscendingSort, setIsAscendingSort] = useState(defaultAscending)
  const [isGroupingEnabled, setIsGroupingEnabled] = useState(defaultGrouped && groupFields.length > 0)
  const [groupByKey, setGroupByKey] = useState<string | null>(defaultGroupKey ?? groupFields[0]?.key ?? null)

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const activeGroupField = groupFields.find((field) => field.key === groupByKey) ?? groupFields[0] ?? null

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (!normalizedSearchQuery) return true
        return searchFields.some((field) => normalizeValue(field.getValue(row)).toLowerCase().includes(normalizedSearchQuery))
      }),
    [rows, searchFields, normalizedSearchQuery],
  )

  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort((a, b) => {
        const comparison = collator.compare(normalizeValue(sortField(a)), normalizeValue(sortField(b)))
        return isAscendingSort ? comparison : -comparison
      }),
    [filteredRows, sortField, isAscendingSort],
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

  return {
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKey,
    setGroupByKey,
    groupFields,
    filteredRows,
    sortedRows,
    groupedRows,
  }
}
