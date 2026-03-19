"use client"

import { useMemo } from "react"
import { useTableColumns, type TableColumnDefinition } from "./use-table-columns"
import { useTableControls, type GroupField, type TableValueGetter, type SearchField } from "./use-table-controls"

export type ConfiguredTableField<T> = TableColumnDefinition & {
  getValue: TableValueGetter<T>
  searchable?: boolean
  groupable?: boolean
  groupLabel?: string
}

export function useConfiguredTableState<T>({
  rows,
  tableKey,
  fields,
  sortField,
  initialSearchQuery = "",
  defaultGrouped = false,
  defaultGroupKey = null,
  defaultGroupKeys,
  defaultAscending = true,
  disableClientFiltering = false,
  disableClientSorting = false,
  disableClientPagination = false,
}: {
  rows: T[]
  tableKey: string
  fields: ConfiguredTableField<T>[]
  sortField: TableValueGetter<T>
  initialSearchQuery?: string
  defaultGrouped?: boolean
  defaultGroupKey?: string | null
  defaultGroupKeys?: string[]
  defaultAscending?: boolean
  disableClientFiltering?: boolean
  disableClientSorting?: boolean
  disableClientPagination?: boolean
}) {
  const columns = useMemo(
    () => fields.map(({ key, label, defaultHidden }) => ({ key, label, defaultHidden })),
    [fields],
  )
  const searchFields = useMemo<SearchField<T>[]>(
    () => fields.filter((field) => field.searchable !== false).map((field) => ({ key: field.key, getValue: field.getValue })),
    [fields],
  )
  const groupFields = useMemo<GroupField<T>[]>(
    () =>
      fields
        .filter((field) => field.groupable !== false)
        .map((field) => ({ key: field.key, label: field.groupLabel ?? field.label, getValue: field.getValue })),
    [fields],
  )

  const tableControls = useTableControls({
    rows,
    searchFields,
    sortField,
    groupFields,
    initialSearchQuery,
    defaultGrouped,
    defaultGroupKey,
    defaultGroupKeys,
    defaultAscending,
    disableClientFiltering,
    disableClientSorting,
    disableClientPagination,
  })

  const tableColumns = useTableColumns({
    tableKey,
    columns,
  })

  return {
    fields,
    columns,
    searchFields,
    ...tableControls,
    ...tableColumns,
  }
}
