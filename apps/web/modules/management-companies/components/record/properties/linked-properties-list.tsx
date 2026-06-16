"use client"

import { useMemo, useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import type { PropertyListRow } from "@builders/domain"
import { DataTable, PaginateControls } from "@/engines/list-view"
import { ActionHeader } from "@/engines/common"
import type { HeaderAction } from "@/engines/common"
import {
  PROPERTIES_LIST_QUERY_KEY,
  listPropertiesRequest,
} from "@/modules/properties/data/list-properties-request"
import { PROPERTIES_LIST_COLUMNS } from "@/modules/properties/components/list/table/properties-list-columns"
import { renderPropertyRowCell } from "@/modules/properties/components/list/table/properties-row-cell"

const SECTION_PAGE_SIZE = 15

const SECTION_CARD_CLASS =
  "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]"

// The canonical properties list columns minus the Management Company column —
// redundant here, where every row already belongs to the same MC.
const PROPERTIES_SECTION_COLUMNS = PROPERTIES_LIST_COLUMNS.filter(
  (column) => column.key !== "managementCompany",
)

function PropertiesSectionCard({
  summary,
  actions,
  children,
}: {
  summary?: string
  actions?: ReadonlyArray<HeaderAction>
  children: ReactNode
}) {
  return (
    <div className={SECTION_CARD_CLASS}>
      <ActionHeader title="Properties" summary={summary} actions={actions} />
      <div className="p-4">{children}</div>
    </div>
  )
}

/**
 * Properties linked to a management company, rendered as §2 of the MC record
 * view. A columned `DataTable` (same primitive + columns as the properties URL
 * list, minus the MC column). Row click **navigates** to that property's
 * standalone record view (via `onSelect`); the header "+ Property" button opens
 * the management form pre-linked to this company (via `onCreate`). Paginated at
 * {@link SECTION_PAGE_SIZE} rows per page.
 */
export function LinkedPropertiesList({
  managementCompanyId,
  onSelect,
  onCreate,
}: {
  managementCompanyId: string
  onSelect: (propertyId: string) => void
  onCreate: () => void
}) {
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: [...PROPERTIES_LIST_QUERY_KEY, "mc-record-section", managementCompanyId, page],
    queryFn: () =>
      listPropertiesRequest({
        filters: { managementCompanyId: [managementCompanyId] },
        page,
        pageSize: SECTION_PAGE_SIZE,
      }),
  })

  const rows = useMemo(() => query.data?.rows ?? [], [query.data])
  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / SECTION_PAGE_SIZE))

  const headerActions: ReadonlyArray<HeaderAction> = [
    { key: "add-property", label: "+ Property", kind: "primary", onClick: onCreate },
  ]

  if (query.isLoading) {
    return (
      <PropertiesSectionCard actions={headerActions}>
        <p className="text-sm text-[var(--foreground)]/60">Loading properties…</p>
      </PropertiesSectionCard>
    )
  }
  if (query.isError) {
    return (
      <PropertiesSectionCard actions={headerActions}>
        <p className="text-sm text-rose-400">Could not load properties.</p>
      </PropertiesSectionCard>
    )
  }

  return (
    <div className={SECTION_CARD_CLASS}>
      <ActionHeader
        title="Properties"
        summary={`${total} ${total === 1 ? "property" : "properties"}`}
        actions={headerActions}
      />
      <DataTable<PropertyListRow>
        rows={rows}
        columns={PROPERTIES_SECTION_COLUMNS}
        renderCell={renderPropertyRowCell}
        empty="No linked properties yet."
        onOpenRow={(row) => onSelect(row.id)}
        getRowAriaLabel={(row) => `Open property ${row.name}`}
        className="rounded-none! border-0! shadow-none!"
      />
      {totalPages > 1 ? (
        <PaginateControls
          page={page}
          pageSize={SECTION_PAGE_SIZE}
          totalItems={total}
          totalPages={totalPages}
          hasPreviousPage={page > 1}
          hasNextPage={page < totalPages}
          onPreviousPage={() => setPage((p) => Math.max(1, p - 1))}
          onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="border-t border-[var(--panel-border)]"
        />
      ) : null}
    </div>
  )
}
