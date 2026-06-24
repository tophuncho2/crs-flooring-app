"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import type { TemplatesListFilters } from "@builders/application"
import type { TemplateListRow } from "@builders/domain"
import { DataTable, useRecordSectionPagination } from "@/engines/list-view"
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

const SECTION_CARD_CLASS =
  "rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]"

/**
 * Templates section rendered inside a record-view (property or entity). A light
 * section card (mirrors the work-orders material-items chrome) wrapping the
 * canonical columned `DataTable` — reusing the templates list-view columns and
 * cell renderer. Backed by the shared `listTemplatesRequest` (default order is
 * property-name A-Z → unitType), filtered by `propertyId` (property view) or
 * `entityId` (entity view). Row click opens the template record,
 * threading the current page as `returnTo`.
 */
export function TemplatesSectionList({ filters }: { filters: TemplatesListFilters }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)
  const pager = useRecordSectionPagination()

  const query = useQuery({
    queryKey: [...TEMPLATES_LIST_QUERY_KEY, "record-section", filters, pager.page],
    queryFn: () => listTemplatesRequest({ filters, page: pager.page, pageSize: pager.pageSize }),
  })

  const rows = useMemo(() => query.data?.rows ?? [], [query.data])
  const total = query.data?.total ?? 0

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
              entityId: row.entityId,
              entityLabel: row.entityName,
              returnTo,
            }),
          )
        }
        getRowAriaLabel={(row) => `Open template ${row.templateNumber}`}
        className="rounded-none! border-0! shadow-none!"
        pagination={pager.toContract(total)}
      />
    </div>
  )
}
