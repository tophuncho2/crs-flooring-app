"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ActionHeader } from "@/components/headers"
import { DataTable } from "@/components/data-table"
import type { ListInput, PropertiesListFilters } from "@builders/application"
import { LIST_PROPERTIES_PAGE_SIZE, type PropertyListRow } from "@builders/domain"
import {
  PROPERTIES_LIST_QUERY_KEY,
  listPropertiesRequest,
} from "@/modules/properties/data/list-properties-request"
import { PROPERTIES_LIST_COLUMNS } from "@/modules/properties/components/list/table/properties-list-columns"
import { renderPropertyRowCell } from "@/modules/properties/components/list/table/properties-row-cell"

export type ManagementCompanyPropertiesSectionProps = {
  managementCompanyId: string
  initialInput?: ListInput<PropertiesListFilters>
  onOpenProperty: (row: PropertyListRow) => void
}

/**
 * Properties grid on the management-company hub view. Fetches its own
 * page of properties filtered by `managementCompanyId` via the existing
 * `/api/properties` endpoint — the same one the properties list view
 * calls. Mutations on the embedded property side panel invalidate
 * `PROPERTIES_LIST_QUERY_KEY` (prefix match), so this section refetches
 * after a save / delete.
 */
export function ManagementCompanyPropertiesSection({
  managementCompanyId,
  initialInput,
  onOpenProperty,
}: ManagementCompanyPropertiesSectionProps) {
  const [page, setPage] = useState(initialInput?.page ?? 1)

  useEffect(() => {
    setPage(1)
  }, [managementCompanyId])

  const input = useMemo<ListInput<PropertiesListFilters>>(
    () => ({
      filters: { managementCompanyId: [managementCompanyId] },
      page,
      pageSize: LIST_PROPERTIES_PAGE_SIZE,
    }),
    [managementCompanyId, page],
  )

  const query = useQuery({
    queryKey: [...PROPERTIES_LIST_QUERY_KEY, input],
    queryFn: () => listPropertiesRequest(input),
  })

  const data = query.data
  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const pageSize = input.pageSize ?? LIST_PROPERTIES_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const showPagination = total > pageSize
  const prevDisabled = page <= 1 || query.isFetching
  const nextDisabled = page >= totalPages || query.isFetching

  const summary = `${total} propert${total === 1 ? "y" : "ies"}`

  const emptyMessage = query.isError
    ? "Could not load properties."
    : query.isLoading
      ? "Loading properties…"
      : "No properties linked to this management company."

  const pagination = showPagination ? (
    <div className="flex items-center justify-between gap-2 text-xs text-[var(--foreground)]/65">
      <span className="tabular-nums text-[var(--foreground)]/55">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={prevDisabled}
          className="rounded border border-[var(--panel-border)] px-2 py-1 transition hover:bg-[var(--panel-hover)] disabled:opacity-50"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={nextDisabled}
          className="rounded border border-[var(--panel-border)] px-2 py-1 transition hover:bg-[var(--panel-hover)] disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  ) : undefined

  return (
    <DataTable<PropertyListRow>
      rows={rows}
      columns={PROPERTIES_LIST_COLUMNS}
      empty={emptyMessage}
      renderCell={renderPropertyRowCell}
      onRowClick={onOpenProperty}
      getRowAriaLabel={(row) => `Open property ${row.name}`}
      headerSlot={<ActionHeader title="Properties" summary={<span>{summary}</span>} />}
      footerSlot={pagination}
    />
  )
}
