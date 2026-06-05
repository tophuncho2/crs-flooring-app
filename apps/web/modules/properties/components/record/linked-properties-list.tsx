"use client"

import { useMemo, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import type { PropertyListRow } from "@builders/domain"
import { DataTable } from "@/engines/list-view"
import { ActionHeader } from "@/components/headers"
import {
  PROPERTIES_LIST_QUERY_KEY,
  listPropertiesRequest,
} from "@/modules/properties/data/list-properties-request"
import { PROPERTIES_LIST_COLUMNS } from "@/modules/properties/components/list/table/properties-list-columns"
import { renderPropertyRowCell } from "@/modules/properties/components/list/table/properties-row-cell"

const SECTION_PAGE_SIZE = 100

const SECTION_CARD_CLASS =
  "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]"

// The canonical properties list columns minus the Management Company column —
// redundant here, where every row already belongs to the same MC.
const PROPERTIES_SECTION_COLUMNS = PROPERTIES_LIST_COLUMNS.filter(
  (column) => column.key !== "managementCompany",
)

function PropertiesSectionCard({
  summary,
  children,
}: {
  summary?: string
  children: ReactNode
}) {
  return (
    <div className={SECTION_CARD_CLASS}>
      <ActionHeader title="Properties" summary={summary} />
      <div className="p-4">{children}</div>
    </div>
  )
}

/**
 * Properties linked to a management company, rendered as the list face of the
 * MC record view's properties drilldown section. A columned `DataTable` (same
 * primitive + columns as the properties URL list, minus the MC column). Row
 * click drills into that property's embedded record view (via `select`).
 */
export function LinkedPropertiesList({
  managementCompanyId,
  onSelect,
}: {
  managementCompanyId: string
  onSelect: (propertyId: string) => void
}) {
  const query = useQuery({
    queryKey: [...PROPERTIES_LIST_QUERY_KEY, "mc-record-section", managementCompanyId],
    queryFn: () =>
      listPropertiesRequest({
        filters: { managementCompanyId: [managementCompanyId] },
        page: 1,
        pageSize: SECTION_PAGE_SIZE,
      }),
  })

  const rows = useMemo(() => query.data?.rows ?? [], [query.data])

  if (query.isLoading) {
    return (
      <PropertiesSectionCard>
        <p className="text-sm text-[var(--foreground)]/60">Loading properties…</p>
      </PropertiesSectionCard>
    )
  }
  if (query.isError) {
    return (
      <PropertiesSectionCard>
        <p className="text-sm text-rose-400">Could not load properties.</p>
      </PropertiesSectionCard>
    )
  }

  return (
    <div className={SECTION_CARD_CLASS}>
      <ActionHeader
        title="Properties"
        summary={`${rows.length} ${rows.length === 1 ? "property" : "properties"}`}
      />
      <DataTable<PropertyListRow>
        rows={rows}
        columns={PROPERTIES_SECTION_COLUMNS}
        renderCell={renderPropertyRowCell}
        empty="No linked properties yet."
        onRowClick={(row) => onSelect(row.id)}
        getRowAriaLabel={(row) => `Open property ${row.name}`}
        className="rounded-none! border-0! shadow-none!"
      />
    </div>
  )
}
