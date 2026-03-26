"use client"

import { useEffect, useMemo, useState } from "react"
import type { TablePreferencePayload } from "./table-preferences"

export type TableColumnDefinition = {
  key: string
  label: string
  defaultHidden?: boolean
  groupable?: boolean
}

const DEFAULT_MAX_GROUP_FIELDS = 3

function areStringArraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false
  }

  return left.every((value, index) => value === right[index])
}

function areColumnVisibilityMapsEqual(left: Record<string, boolean>, right: Record<string, boolean>) {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)

  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  return leftKeys.every((key) => right[key] === left[key])
}

export function normalizeColumnOrder(columnKeys: string[], requestedOrder: string[]) {
  const normalizedOrder = Array.from(new Set(requestedOrder.filter((key) => columnKeys.includes(key))))

  for (const key of columnKeys) {
    if (!normalizedOrder.includes(key)) {
      normalizedOrder.push(key)
    }
  }

  return normalizedOrder
}

export function normalizeColumnVisibility(
  columnKeys: string[],
  requestedVisibility: Record<string, boolean> | undefined,
  defaultHiddenKeys: string[],
) {
  return Object.fromEntries(
    columnKeys.map((key) => {
      if (requestedVisibility && Object.prototype.hasOwnProperty.call(requestedVisibility, key)) {
        return [key, requestedVisibility[key]]
      }

      return [key, !defaultHiddenKeys.includes(key)]
    }),
  ) as Record<string, boolean>
}

export function normalizeGroupedColumnKeys(
  requestedGroupKeys: string[],
  allowedGroupKeys: string[],
  maxGroupFields = DEFAULT_MAX_GROUP_FIELDS,
) {
  return Array.from(
    new Set(requestedGroupKeys.filter((key) => allowedGroupKeys.includes(key))),
  ).slice(0, maxGroupFields)
}

export function toggleGroupedColumnKey(
  currentGroupKeys: string[],
  columnKey: string,
  allowedGroupKeys: string[],
  maxGroupFields = DEFAULT_MAX_GROUP_FIELDS,
) {
  if (!allowedGroupKeys.includes(columnKey)) {
    return currentGroupKeys
  }

  const normalizedKeys = normalizeGroupedColumnKeys(currentGroupKeys, allowedGroupKeys, maxGroupFields)
  const existingIndex = normalizedKeys.indexOf(columnKey)

  if (existingIndex >= 0) {
    return normalizedKeys.slice(0, existingIndex)
  }

  if (normalizedKeys.length >= maxGroupFields) {
    return normalizedKeys
  }

  return [...normalizedKeys, columnKey]
}

export function useTableColumns<TColumn extends TableColumnDefinition>({
  columns,
  initialPreferences,
}: {
  columns: TColumn[]
  initialPreferences?: TablePreferencePayload | null
}) {
  const columnKeys = useMemo(() => columns.map((column) => column.key), [columns])
  const defaultHiddenKeys = useMemo(
    () => columns.filter((column) => column.defaultHidden).map((column) => column.key),
    [columns],
  )
  const normalizedInitialOrder = useMemo(
    () => normalizeColumnOrder(columnKeys, initialPreferences?.columnOrder ?? []),
    [columnKeys, initialPreferences?.columnOrder],
  )
  const normalizedInitialVisibility = useMemo(
    () => normalizeColumnVisibility(columnKeys, initialPreferences?.columnVisibility, defaultHiddenKeys),
    [columnKeys, defaultHiddenKeys, initialPreferences?.columnVisibility],
  )
  const [columnOrder, setColumnOrderState] = useState<string[]>(normalizedInitialOrder)
  const [columnVisibility, setColumnVisibilityState] = useState<Record<string, boolean>>(normalizedInitialVisibility)

  useEffect(() => {
    setColumnOrderState((current) => (areStringArraysEqual(current, normalizedInitialOrder) ? current : normalizedInitialOrder))
  }, [normalizedInitialOrder])

  useEffect(() => {
    setColumnVisibilityState((current) => (
      areColumnVisibilityMapsEqual(current, normalizedInitialVisibility) ? current : normalizedInitialVisibility
    ))
  }, [normalizedInitialVisibility])

  function toggleColumnVisibility(columnKey: string, isVisible: boolean) {
    const visibleCount = columnKeys.filter((key) => columnVisibility[key] !== false).length
    if (!isVisible && visibleCount <= 1 && columnVisibility[columnKey] !== false) {
      return
    }

    setColumnVisibilityState((current) => ({
      ...current,
      [columnKey]: isVisible,
    }))
  }

  function moveColumn(columnKey: string, direction: "up" | "down") {
    setColumnOrderState((current) => {
      const currentIndex = current.indexOf(columnKey)
      if (currentIndex === -1) return current

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
      if (targetIndex < 0 || targetIndex >= current.length) return current

      const nextOrder = [...current]
      const [movedColumn] = nextOrder.splice(currentIndex, 1)
      nextOrder.splice(targetIndex, 0, movedColumn)
      return nextOrder
    })
  }

  function setColumnOrder(nextOrder: string[]) {
    setColumnOrderState(normalizeColumnOrder(columnKeys, nextOrder))
  }

  const orderedColumns = useMemo(() => {
    const columnMap = new Map(columns.map((column) => [column.key, column]))
    return columnOrder.map((key) => columnMap.get(key)).filter((column): column is TColumn => Boolean(column))
  }, [columnOrder, columns])

  const visibleColumns = useMemo(
    () => orderedColumns.filter((column) => columnVisibility[column.key] !== false),
    [columnVisibility, orderedColumns],
  )

  return {
    allColumns: orderedColumns,
    visibleColumns,
    columnVisibility,
    columnOrder,
    hiddenColumnKeys: columnKeys.filter((key) => columnVisibility[key] === false),
    toggleColumnVisibility,
    moveColumn,
    setColumnOrder,
  }
}
