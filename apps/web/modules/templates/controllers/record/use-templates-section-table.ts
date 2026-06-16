"use client"

import { useCallback, useMemo, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { ListInput, TemplatesListFilters } from "@builders/application"
import type { TemplateListRow } from "@builders/domain"
import {
  TEMPLATES_LIST_QUERY_KEY,
  listTemplatesRequest,
} from "@/modules/templates/data/list-templates-request"

/** Section table page size — small so the record-view section stays compact. */
export const TEMPLATE_SECTION_PAGE_SIZE = 15

export type TemplatesSectionTableController = {
  rows: ReadonlyArray<TemplateListRow>
  total: number
  page: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
  goToPrevious: () => void
  goToNext: () => void
  /** Return to page 1. */
  reset: () => void
  isLoading: boolean
  isFetching: boolean
  error: string | null
}

/**
 * Local-state controller behind the templates record-view section table. Holds
 * the current page in React state (NOT the URL — the section's transient page
 * must not pollute the record-view URL) and fetches a page of `TemplateListRow`s
 * through the same list endpoint the templates list view uses
 * (`listTemplatesRequest`). The scoped management company + property ride in as
 * filters (both optional — the table lists across everything when none is set);
 * any scope change resets to page 1. `enabled` gates the fetch.
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
  const [page, setPage] = useState(1)

  // Re-scoping (different MC / property) returns to page 1. Reset during render
  // against the previous scope rather than in an effect — React applies it before
  // paint with no extra commit (the recommended "adjust state when a prop
  // changes" pattern).
  const scopeKey = `${managementCompanyId ?? ""}|${propertyId ?? ""}`
  const [prevScopeKey, setPrevScopeKey] = useState(scopeKey)
  if (scopeKey !== prevScopeKey) {
    setPrevScopeKey(scopeKey)
    setPage(1)
  }

  const input = useMemo<ListInput<TemplatesListFilters>>(() => {
    const filters: TemplatesListFilters = {
      ...(managementCompanyId ? { managementCompanyId: [managementCompanyId] } : {}),
      ...(propertyId ? { propertyId: [propertyId] } : {}),
    }
    return { filters, page, pageSize: TEMPLATE_SECTION_PAGE_SIZE }
  }, [managementCompanyId, propertyId, page])

  const query = useQuery({
    queryKey: [...TEMPLATES_LIST_QUERY_KEY, "record-section", input],
    queryFn: () => listTemplatesRequest(input),
    enabled,
    placeholderData: keepPreviousData,
  })

  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / TEMPLATE_SECTION_PAGE_SIZE))
  const rows = query.data?.rows ?? []

  const goToPrevious = useCallback(() => setPage((current) => Math.max(1, current - 1)), [])
  const goToNext = useCallback(() => setPage((current) => current + 1), [])

  const reset = useCallback(() => setPage(1), [])

  return {
    rows,
    total,
    page,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
    goToPrevious,
    goToNext,
    reset,
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
