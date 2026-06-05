"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import type { TemplatesListFilters } from "@builders/application"
import type { TemplateListRow } from "@builders/domain"
import { DataTable } from "@/engines/list-view"
import { ActionHeader } from "@/components/headers"
import {
  TEMPLATES_LIST_QUERY_KEY,
  listTemplatesRequest,
} from "@/modules/templates/data/list-templates-request"
import {
  TEMPLATES_LIST_COLUMNS,
} from "@/modules/templates/components/list/table/templates-list-columns"
import { renderTemplateRowCell } from "@/modules/templates/components/list/table/templates-row-cell"
import { buildCurrentRecordEntryPath, buildRecordDetailHref } from "@/hooks/navigation/routes"

const SECTION_PAGE_SIZE = 100

const SECTION_CARD_CLASS =
  "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]"

/**
 * Templates section rendered inside a record-view (property or MC). A light
 * section card (mirrors the work-orders material-items chrome) wrapping the
 * canonical columned `DataTable` — reusing the templates list-view columns and
 * cell renderer. Backed by the shared `listTemplatesRequest` (default order is
 * property-name A-Z → unitType), filtered by `propertyId` (property view) or
 * `managementCompanyId` (MC view). Row click opens the template record,
 * threading the current page as `returnTo`.
 */
export function TemplatesSectionList({ filters }: { filters: TemplatesListFilters }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

  const query = useQuery({
    queryKey: [...TEMPLATES_LIST_QUERY_KEY, "record-section", filters],
    queryFn: () => listTemplatesRequest({ filters, page: 1, pageSize: SECTION_PAGE_SIZE }),
  })

  const rows = useMemo(() => query.data?.rows ?? [], [query.data])

  if (query.isLoading) {
    return (
      <div className={SECTION_CARD_CLASS}>
        <ActionHeader title="Templates" />
        <p className="px-4 py-6 text-sm text-[var(--foreground)]/60">Loading templates…</p>
      </div>
    )
  }
  if (query.isError) {
    return (
      <div className={SECTION_CARD_CLASS}>
        <ActionHeader title="Templates" />
        <p className="px-4 py-6 text-sm text-rose-400">Could not load templates.</p>
      </div>
    )
  }

  return (
    <div className={SECTION_CARD_CLASS}>
      <ActionHeader
        title="Templates"
        summary={`${rows.length} ${rows.length === 1 ? "template" : "templates"}`}
      />
      <DataTable<TemplateListRow>
        rows={rows}
        columns={TEMPLATES_LIST_COLUMNS}
        renderCell={renderTemplateRowCell}
        empty="No templates yet."
        onRowClick={(row) =>
          router.push(buildRecordDetailHref("/dashboard/templates", row.id, returnTo))
        }
        getRowAriaLabel={(row) => `Open template ${row.templateNumber}`}
        className="rounded-none! border-0! shadow-none!"
      />
    </div>
  )
}
