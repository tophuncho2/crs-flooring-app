"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import type { TemplatesListFilters } from "@builders/application"
import type { TemplateListRow } from "@builders/domain"
import { DataTable } from "@/engines/list-view"
import { ActionHeader } from "@/engines/common"
import {
  TEMPLATES_LIST_QUERY_KEY,
  listTemplatesRequest,
} from "@/modules/templates/data/list-templates-request"
import {
  TEMPLATES_LIST_COLUMNS,
} from "@/modules/templates/components/list/table/templates-list-columns"
import { renderTemplateRowCell } from "@/modules/templates/components/list/table/templates-row-cell"
import { buildCurrentRecordEntryPath, buildTemplateHubHref } from "@/hooks/navigation/routes"

const SECTION_PAGE_SIZE = 15

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
  const [page, setPage] = useState(1)

  const query = useQuery({
    queryKey: [...TEMPLATES_LIST_QUERY_KEY, "record-section", filters, page],
    queryFn: () => listTemplatesRequest({ filters, page, pageSize: SECTION_PAGE_SIZE }),
  })

  const rows = useMemo(() => query.data?.rows ?? [], [query.data])
  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / SECTION_PAGE_SIZE))

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
        summary={`${total} ${total === 1 ? "template" : "templates"}`}
      />
      <DataTable<TemplateListRow>
        rows={rows}
        columns={TEMPLATES_LIST_COLUMNS}
        renderCell={renderTemplateRowCell}
        empty="No templates yet."
        onOpenRow={(row) =>
          router.push(
            buildTemplateHubHref({
              templateId: row.id,
              templateLabel: row.unitType,
              propertyId: row.propertyId,
              propertyLabel: row.propertyName,
              managementCompanyId: row.managementCompanyId,
              managementCompanyLabel: row.managementCompanyName,
              returnTo,
            }),
          )
        }
        getRowAriaLabel={(row) => `Open template ${row.templateNumber}`}
        className="rounded-none! border-0! shadow-none!"
        pagination={{
          page,
          pageSize: SECTION_PAGE_SIZE,
          totalItems: total,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
          onPreviousPage: () => setPage((p) => Math.max(1, p - 1)),
          onNextPage: () => setPage((p) => Math.min(totalPages, p + 1)),
        }}
      />
    </div>
  )
}
