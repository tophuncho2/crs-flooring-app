"use client"

import { useMemo, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { ListInput, TemplatesListFilters } from "@builders/application"
import type { TemplateListRow } from "@builders/domain"
import { useRecordSectionPagination, type PaginateContract } from "@/engines/list-view"
import {
  TEMPLATES_LIST_QUERY_KEY,
  listTemplatesRequest,
} from "@/modules/templates/data/list-templates-request"

export type TemplatesSectionTableController = {
  rows: ReadonlyArray<TemplateListRow>
  total: number
  /** Engine-derived pagination contract — wire straight into `DataTable`. */
  pagination: PaginateContract
  /** Return to page 1. */
  reset: () => void
  isLoading: boolean
  isFetching: boolean
  error: string | null
}

/**
 * Local-state controller behind the templates record-view section table. Page
 * state, the `15` page size, and the pagination contract are owned by the engine
 * (`useRecordSectionPagination`); this controller adds the scoped fetch through
 * the same list endpoint the templates list view uses (`listTemplatesRequest`).
 * The scoped management company + property ride in as filters (both optional —
 * the table lists across everything when none is set); any scope change resets
 * to page 1. `enabled` gates the fetch.
 */
export function useTemplatesSectionTable({
  managementCompanyId,
  propertyId,
  enabled,
}: {
  managementCompanyId: string | null
  propertyId: string | null
  enabled: boolean
}): TemplatesSectionTableController {
  const pager = useRecordSectionPagination()

  // Re-scoping (different MC / property) returns to page 1. Reset during render
  // against the previous scope rather than in an effect — React applies it before
  // paint with no extra commit (the recommended "adjust state when a prop
  // changes" pattern).
  const scopeKey = `${managementCompanyId ?? ""}|${propertyId ?? ""}`
  const [prevScopeKey, setPrevScopeKey] = useState(scopeKey)
  if (scopeKey !== prevScopeKey) {
    setPrevScopeKey(scopeKey)
    pager.reset()
  }

  const input = useMemo<ListInput<TemplatesListFilters>>(() => {
    const filters: TemplatesListFilters = {
      ...(managementCompanyId ? { managementCompanyId: [managementCompanyId] } : {}),
      ...(propertyId ? { propertyId: [propertyId] } : {}),
    }
    return { filters, page: pager.page, pageSize: pager.pageSize }
  }, [managementCompanyId, propertyId, pager.page, pager.pageSize])

  const query = useQuery({
    queryKey: [...TEMPLATES_LIST_QUERY_KEY, "record-section", input],
    queryFn: () => listTemplatesRequest(input),
    enabled,
    placeholderData: keepPreviousData,
  })

  const total = query.data?.total ?? 0
  const rows = query.data?.rows ?? []

  return {
    rows,
    total,
    pagination: pager.toContract(total),
    reset: pager.reset,
    isLoading: enabled && query.isLoading,
    isFetching: query.isFetching,
    error:
      query.isError && query.error instanceof Error
        ? query.error.message
        : query.isError
          ? "Failed to load templates."
          : null,
  }
}
