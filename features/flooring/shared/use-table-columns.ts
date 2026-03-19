"use client"

import { useEffect, useMemo, useRef, useState } from "react"

export type TableColumnDefinition = {
  key: string
  label: string
  defaultHidden?: boolean
}

type PreferencePayload = {
  hiddenColumnKeys: string[]
  columnOrderKeys: string[]
}

export function useTableColumns<TColumn extends TableColumnDefinition>({
  tableKey,
  columns,
}: {
  tableKey: string
  columns: TColumn[]
}) {
  const columnKeys = useMemo(() => columns.map((column) => column.key), [columns])
  const defaultHiddenKeys = useMemo(
    () => columns.filter((column) => column.defaultHidden).map((column) => column.key),
    [columns],
  )
  const columnKeySignature = useMemo(() => columnKeys.join("|"), [columnKeys])
  const defaultHiddenSignature = useMemo(() => defaultHiddenKeys.join("|"), [defaultHiddenKeys])
  const columnKeysRef = useRef(columnKeys)
  const defaultHiddenKeysRef = useRef(defaultHiddenKeys)

  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>(defaultHiddenKeys)
  const [columnOrderKeys, setColumnOrderKeys] = useState<string[]>(columnKeys)
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true)
  const [preferenceError, setPreferenceError] = useState("")
  const hasLoadedRef = useRef(false)

  columnKeysRef.current = columnKeys
  defaultHiddenKeysRef.current = defaultHiddenKeys

  useEffect(() => {
    let isCancelled = false

    async function loadPreferences() {
      try {
        setIsLoadingPreferences(true)
        setPreferenceError("")

        const response = await fetch(`/api/account/table-preferences/${tableKey}`, { cache: "no-store" })
        const payload = (await response.json().catch(() => ({}))) as Partial<PreferencePayload> & { error?: string }

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load table preferences")
        }

        if (isCancelled) return

        const nextOrder = Array.isArray(payload.columnOrderKeys)
          ? payload.columnOrderKeys.filter((key) => columnKeysRef.current.includes(key))
          : []
        for (const key of columnKeysRef.current) {
          if (!nextOrder.includes(key)) nextOrder.push(key)
        }

        const nextHidden = Array.isArray(payload.hiddenColumnKeys)
          ? payload.hiddenColumnKeys.filter((key) => columnKeysRef.current.includes(key))
          : defaultHiddenKeysRef.current

        setColumnOrderKeys(nextOrder)
        setHiddenColumnKeys(nextHidden)
      } catch (error) {
        if (isCancelled) return
        setColumnOrderKeys(columnKeysRef.current)
        setHiddenColumnKeys(defaultHiddenKeysRef.current)
        setPreferenceError(error instanceof Error ? error.message : "Failed to load table preferences")
      } finally {
        if (!isCancelled) {
          setIsLoadingPreferences(false)
          hasLoadedRef.current = true
        }
      }
    }

    void loadPreferences()

    return () => {
      isCancelled = true
    }
  }, [columnKeySignature, defaultHiddenSignature, tableKey])

  async function persistPreferences(nextHiddenKeys: string[], nextOrderKeys: string[]) {
    try {
      setPreferenceError("")
      const response = await fetch(`/api/account/table-preferences/${tableKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hiddenColumnKeys: nextHiddenKeys,
          columnOrderKeys: nextOrderKeys,
          allowedColumnKeys: columnKeys,
        }),
      })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save table preferences")
      }
    } catch (error) {
      setPreferenceError(error instanceof Error ? error.message : "Failed to save table preferences")
    }
  }

  function toggleColumnVisibility(columnKey: string, isVisible: boolean) {
    const currentlyVisibleCount = columnKeys.length - hiddenColumnKeys.length
    if (!isVisible && currentlyVisibleCount <= 1 && !hiddenColumnKeys.includes(columnKey)) {
      return
    }

    const nextHiddenKeys = isVisible
      ? hiddenColumnKeys.filter((key) => key !== columnKey)
      : Array.from(new Set([...hiddenColumnKeys, columnKey]))

    setHiddenColumnKeys(nextHiddenKeys)
    void persistPreferences(nextHiddenKeys, columnOrderKeys)
  }

  function moveColumn(columnKey: string, direction: "up" | "down") {
    const currentIndex = columnOrderKeys.indexOf(columnKey)
    if (currentIndex === -1) return

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= columnOrderKeys.length) return

    const nextOrderKeys = [...columnOrderKeys]
    const [moved] = nextOrderKeys.splice(currentIndex, 1)
    nextOrderKeys.splice(targetIndex, 0, moved)

    setColumnOrderKeys(nextOrderKeys)
    void persistPreferences(hiddenColumnKeys, nextOrderKeys)
  }

  function setColumnOrder(nextOrderKeys: string[]) {
    const normalizedOrder = Array.from(new Set(nextOrderKeys.filter((key) => columnKeys.includes(key))))
    for (const key of columnKeys) {
      if (!normalizedOrder.includes(key)) {
        normalizedOrder.push(key)
      }
    }

    setColumnOrderKeys(normalizedOrder)
    void persistPreferences(hiddenColumnKeys, normalizedOrder)
  }

  const orderedColumns = useMemo(() => {
    const columnMap = new Map(columns.map((column) => [column.key, column]))
    return columnOrderKeys.map((key) => columnMap.get(key)).filter((column): column is TColumn => Boolean(column))
  }, [columnOrderKeys, columns])

  const visibleColumns = useMemo(
    () => orderedColumns.filter((column) => !hiddenColumnKeys.includes(column.key)),
    [hiddenColumnKeys, orderedColumns],
  )

  return {
    allColumns: orderedColumns,
    visibleColumns,
    hiddenColumnKeys,
    isLoadingPreferences,
    preferenceError,
    hasLoadedPreferences: hasLoadedRef.current,
    toggleColumnVisibility,
    moveColumn,
    setColumnOrder,
  }
}
