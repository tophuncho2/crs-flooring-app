"use client"

import { useMemo, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { ActionHeader } from "@/components/headers"
import {
  PROPERTIES_LIST_QUERY_KEY,
  listPropertiesRequest,
} from "@/modules/properties/data/list-properties-request"

const SECTION_PAGE_SIZE = 100

const SECTION_CARD_CLASS =
  "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]"

const ROW_CLASS =
  "flex w-full items-center justify-between gap-3 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-left text-sm transition hover:border-sky-500/40 hover:bg-[var(--panel-hover)] focus:outline-none focus:ring-1 focus:ring-sky-500/40"

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
 * MC record view's properties drilldown section. Row click drills into that
 * property's embedded record view (via the drilldown's `select`).
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
  if (rows.length === 0) {
    return (
      <PropertiesSectionCard>
        <p className="text-sm text-[var(--foreground)]/60">No linked properties yet.</p>
      </PropertiesSectionCard>
    )
  }

  return (
    <PropertiesSectionCard
      summary={`${rows.length} ${rows.length === 1 ? "property" : "properties"}`}
    >
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li key={row.id}>
            <button type="button" className={ROW_CLASS} onClick={() => onSelect(row.id)}>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-[var(--foreground)]">{row.name}</span>
                {row.fullAddress ? (
                  <span className="truncate text-xs text-[var(--foreground)]/60">
                    {row.fullAddress}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs text-[var(--foreground)]/50">
                {row.templateCount} {row.templateCount === 1 ? "template" : "templates"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </PropertiesSectionCard>
  )
}
