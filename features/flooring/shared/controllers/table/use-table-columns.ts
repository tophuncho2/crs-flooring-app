"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { patchTablePreference } from "./table-preference-client"
import { DEFAULT_TABLE_PREFERENCE_PAYLOAD, type TablePreferencePayload } from "./table-preferences"

export type TableColumnDefinition = {
  key: string
  label: string
  defaultHidden?: boolean
  groupable?: boolean
}

type PreferencePayload = {
  hiddenColumnKeys: string[]
  columnOrderKeys: string[]
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
  filters: Record<string, string>
}

const tablePreferencesCache = new Map<string, PreferencePayload>()
const tablePreferencesInflight = new Map<string, Promise<PreferencePayload>>()

export function useTableColumns<TColumn extends TableColumnDefinition>({
  tableKey,
  columns,
  initialPreferences,
}: {
  tableKey: string
  columns: TColumn[]
  initialPreferences?: TablePreferencePayload | null
}) {
  const columnKeys = useMemo(() => columns.map((column) => column.key), [columns])
  const defaultHiddenKeys = useMemo(
    () => columns.filter((column) => column.defaultHidden).map((column) => column.key),
    [columns],
  )
  const columnKeySignature = useMemo(() => columnKeys.join("|"), [columnKeys])
  const defaultHiddenSignature = useMemo(() => defaultHiddenKeys.join("|"), [defaultHiddenKeys])
  const preferenceCacheKey = useMemo(
    () => `${tableKey}::${columnKeySignature}::${defaultHiddenSignature}`,
    [columnKeySignature, defaultHiddenSignature, tableKey],
  )
  const columnKeysRef = useRef(columnKeys)
  const defaultHiddenKeysRef = useRef(defaultHiddenKeys)
  const viewPreferenceRef = useRef({
    isAscendingSort: DEFAULT_TABLE_PREFERENCE_PAYLOAD.isAscendingSort,
    isGroupingEnabled: DEFAULT_TABLE_PREFERENCE_PAYLOAD.isGroupingEnabled,
    groupByKeys: DEFAULT_TABLE_PREFERENCE_PAYLOAD.groupByKeys,
    filters: DEFAULT_TABLE_PREFERENCE_PAYLOAD.filters,
  })

  const normalizePayload = (payload: Partial<TablePreferencePayload>) => {
    const nextOrder = Array.isArray(payload.columnOrderKeys)
      ? payload.columnOrderKeys.filter((key) => columnKeysRef.current.includes(key))
      : []
    for (const key of columnKeysRef.current) {
      if (!nextOrder.includes(key)) nextOrder.push(key)
    }

    const nextHidden = Array.isArray(payload.hiddenColumnKeys)
      ? payload.hiddenColumnKeys.filter((key) => columnKeysRef.current.includes(key))
      : defaultHiddenKeysRef.current

    return {
      columnOrderKeys: nextOrder,
      hiddenColumnKeys: nextHidden,
      isAscendingSort: typeof payload.isAscendingSort === "boolean" ? payload.isAscendingSort : DEFAULT_TABLE_PREFERENCE_PAYLOAD.isAscendingSort,
      isGroupingEnabled:
        typeof payload.isGroupingEnabled === "boolean" ? payload.isGroupingEnabled : DEFAULT_TABLE_PREFERENCE_PAYLOAD.isGroupingEnabled,
      groupByKeys:
        Array.isArray(payload.groupByKeys) && payload.groupByKeys.every((key) => typeof key === "string")
          ? Array.from(new Set(payload.groupByKeys))
          : DEFAULT_TABLE_PREFERENCE_PAYLOAD.groupByKeys,
      filters:
        payload.filters && typeof payload.filters === "object" && !Array.isArray(payload.filters)
          ? Object.fromEntries(
              Object.entries(payload.filters).filter((entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string"),
            )
          : DEFAULT_TABLE_PREFERENCE_PAYLOAD.filters,
    }
  }

  const normalizedInitialPreferences = useMemo(
    () => (initialPreferences ? normalizePayload(initialPreferences) : null),
    [initialPreferences],
  )

  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>(normalizedInitialPreferences?.hiddenColumnKeys ?? defaultHiddenKeys)
  const [columnOrderKeys, setColumnOrderKeys] = useState<string[]>(normalizedInitialPreferences?.columnOrderKeys ?? columnKeys)
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(!normalizedInitialPreferences)
  const [preferenceError, setPreferenceError] = useState("")
  const hasLoadedRef = useRef(false)

  columnKeysRef.current = columnKeys
  defaultHiddenKeysRef.current = defaultHiddenKeys

  useEffect(() => {
    let isCancelled = false

    if (normalizedInitialPreferences) {
      tablePreferencesCache.set(preferenceCacheKey, normalizedInitialPreferences)
      setColumnOrderKeys(normalizedInitialPreferences.columnOrderKeys)
      setHiddenColumnKeys(normalizedInitialPreferences.hiddenColumnKeys)
      viewPreferenceRef.current = {
        isAscendingSort: normalizedInitialPreferences.isAscendingSort,
        isGroupingEnabled: normalizedInitialPreferences.isGroupingEnabled,
        groupByKeys: normalizedInitialPreferences.groupByKeys,
        filters: normalizedInitialPreferences.filters,
      }
      setIsLoadingPreferences(false)
      setPreferenceError("")
      hasLoadedRef.current = true
      return
    }

    const cachedPreferences = tablePreferencesCache.get(preferenceCacheKey)
    if (cachedPreferences) {
      setColumnOrderKeys(cachedPreferences.columnOrderKeys)
      setHiddenColumnKeys(cachedPreferences.hiddenColumnKeys)
      viewPreferenceRef.current = {
        isAscendingSort: cachedPreferences.isAscendingSort,
        isGroupingEnabled: cachedPreferences.isGroupingEnabled,
        groupByKeys: cachedPreferences.groupByKeys,
        filters: cachedPreferences.filters,
      }
      setIsLoadingPreferences(false)
      setPreferenceError("")
      hasLoadedRef.current = true
      return
    }

    async function loadPreferences() {
      try {
        setIsLoadingPreferences(true)
        setPreferenceError("")

        let request = tablePreferencesInflight.get(preferenceCacheKey)
        if (!request) {
          request = fetch(`/api/account/table-preferences/${tableKey}`, { cache: "no-store" })
            .then(async (response) => {
              const payload = (await response.json().catch(() => ({}))) as Partial<PreferencePayload> & { error?: string }

              if (!response.ok) {
                throw new Error(payload.error ?? "Failed to load table preferences")
              }

              const normalizedPayload = normalizePayload(payload)
              tablePreferencesCache.set(preferenceCacheKey, normalizedPayload)
              return normalizedPayload
            })
            .finally(() => {
              tablePreferencesInflight.delete(preferenceCacheKey)
            })
          tablePreferencesInflight.set(preferenceCacheKey, request)
        }

        const payload = await request

        if (isCancelled) return

        setColumnOrderKeys(payload.columnOrderKeys)
        setHiddenColumnKeys(payload.hiddenColumnKeys)
        viewPreferenceRef.current = {
          isAscendingSort: payload.isAscendingSort,
          isGroupingEnabled: payload.isGroupingEnabled,
          groupByKeys: payload.groupByKeys,
          filters: payload.filters,
        }
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
  }, [normalizedInitialPreferences, preferenceCacheKey, tableKey])

  async function persistPreferences(nextHiddenKeys: string[], nextOrderKeys: string[]) {
    try {
      setPreferenceError("")
      await patchTablePreference({
        tableKey,
        patch: {
          hiddenColumnKeys: nextHiddenKeys,
          columnOrderKeys: nextOrderKeys,
        },
        allowedColumnKeys: columnKeys,
      })
      tablePreferencesCache.set(preferenceCacheKey, {
        hiddenColumnKeys: nextHiddenKeys,
        columnOrderKeys: nextOrderKeys,
        isAscendingSort: viewPreferenceRef.current.isAscendingSort,
        isGroupingEnabled: viewPreferenceRef.current.isGroupingEnabled,
        groupByKeys: viewPreferenceRef.current.groupByKeys,
        filters: viewPreferenceRef.current.filters,
      })
    } catch (error) {
      setPreferenceError(error instanceof Error ? error.message : "Failed to save table preferences")
    }
  }

  async function persistViewPreferences({
    isAscendingSort,
    isGroupingEnabled,
    groupByKeys,
    filters,
    allowedGroupKeys,
    allowedFilterValues,
  }: {
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    groupByKeys: string[]
    filters: Record<string, string>
    allowedGroupKeys: string[]
    allowedFilterValues: Record<string, string[]>
  }) {
    try {
      setPreferenceError("")
      await patchTablePreference({
        tableKey,
        patch: {
          isAscendingSort,
          isGroupingEnabled,
          groupByKeys,
          filters,
        },
        allowedGroupKeys,
        allowedFilterValues,
      })
      viewPreferenceRef.current = {
        isAscendingSort,
        isGroupingEnabled,
        groupByKeys,
        filters,
      }
      tablePreferencesCache.set(preferenceCacheKey, {
        hiddenColumnKeys,
        columnOrderKeys,
        isAscendingSort,
        isGroupingEnabled,
        groupByKeys,
        filters,
      })
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
    persistViewPreferences,
  }
}
