"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import type { TemplatesListFilters } from "@builders/application"
import {
  TEMPLATES_LIST_QUERY_KEY,
  listTemplatesRequest,
} from "@/modules/templates/data/list-templates-request"
import { buildCurrentRecordEntryPath, buildRecordDetailHref } from "@/hooks/navigation/routes"

const SECTION_PAGE_SIZE = 100

const ROW_CLASS =
  "flex w-full items-center justify-between gap-3 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-left text-sm transition hover:border-sky-500/40 hover:bg-[var(--panel-hover)] focus:outline-none focus:ring-1 focus:ring-sky-500/40"

/**
 * Read-only templates list rendered inside a record-view section. Backed by the
 * shared `listTemplatesRequest` (default order is property-name A-Z → unitType),
 * filtered by `propertyId` (property view) or `managementCompanyId` (MC view).
 * Row click opens the template record, threading the current page as `returnTo`.
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
    return <p className="text-sm text-[var(--foreground)]/60">Loading templates…</p>
  }
  if (query.isError) {
    return <p className="text-sm text-rose-400">Could not load templates.</p>
  }
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--foreground)]/60">No templates yet.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => {
        const subtitle = [row.propertyName, row.jobTypeName].filter(Boolean).join(" · ")
        return (
          <li key={row.id}>
            <button
              type="button"
              className={ROW_CLASS}
              onClick={() =>
                router.push(buildRecordDetailHref("/dashboard/templates", row.id, returnTo))
              }
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-[var(--foreground)]">
                  {row.unitType || "—"}
                </span>
                {subtitle ? (
                  <span className="truncate text-xs text-[var(--foreground)]/60">{subtitle}</span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs text-[var(--foreground)]/50">
                {row.itemsCount} {row.itemsCount === 1 ? "item" : "items"}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
