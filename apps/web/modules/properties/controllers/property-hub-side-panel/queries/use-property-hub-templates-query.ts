"use client"

import { useCallback, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { LIST_TEMPLATES_PAGE_SIZE, type TemplateListRow } from "@builders/domain"
import {
  TEMPLATES_LIST_QUERY_KEY,
  listTemplatesRequest,
} from "@/modules/templates/data/list-templates-request"

export type PropertyHubTemplatesController = {
  page: number
  totalPages: number
  total: number
  rows: ReadonlyArray<TemplateListRow>
  isFetching: boolean
  isError: boolean
  hasData: boolean
  canPrev: boolean
  canNext: boolean
  goPrev: () => void
  goNext: () => void
}

const EMPTY_ROWS: ReadonlyArray<TemplateListRow> = []

/**
 * Paginated templates under a hub, optionally filtered to one property.
 * Mirrors the superseded `usePropertyHubViewTemplatesQuery`.
 */
export function usePropertyHubTemplatesQuery(
  managementCompanyId: string | null,
  selectedPropertyId: string | null,
): PropertyHubTemplatesController {
  const [page, setPage] = useState(1)

  // Reset to page 1 when the hub MC or selected property changes — derived
  // during render so the query never fires the new filter against the stale page.
  const [trackedMcId, setTrackedMcId] = useState(managementCompanyId)
  const [trackedPropertyId, setTrackedPropertyId] = useState(selectedPropertyId)
  if (trackedMcId !== managementCompanyId || trackedPropertyId !== selectedPropertyId) {
    setTrackedMcId(managementCompanyId)
    setTrackedPropertyId(selectedPropertyId)
    setPage(1)
  }

  const query = useQuery({
    enabled: managementCompanyId !== null,
    queryKey: [
      ...TEMPLATES_LIST_QUERY_KEY,
      "hub-view",
      managementCompanyId,
      selectedPropertyId,
      page,
    ],
    queryFn: () =>
      listTemplatesRequest({
        filters:
          selectedPropertyId !== null
            ? { propertyId: [selectedPropertyId] }
            : { managementCompanyId: [managementCompanyId as string] },
        page,
        pageSize: LIST_TEMPLATES_PAGE_SIZE,
      }),
  })

  const data = query.data
  const total = data?.total ?? 0
  const pageSize = LIST_TEMPLATES_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rows = (data?.rows ?? EMPTY_ROWS) as ReadonlyArray<TemplateListRow>

  const goPrev = useCallback(() => {
    setPage((value) => Math.max(1, value - 1))
  }, [])

  const goNext = useCallback(() => {
    setPage((value) => Math.min(totalPages, value + 1))
  }, [totalPages])

  return useMemo<PropertyHubTemplatesController>(() => {
    const hasData = data !== undefined
    const canPrev = hasData && page > 1 && !query.isFetching
    const canNext = hasData && page < totalPages && !query.isFetching
    return {
      page,
      totalPages,
      total,
      rows,
      isFetching: query.isFetching,
      isError: query.isError,
      hasData,
      canPrev,
      canNext,
      goPrev,
      goNext,
    }
  }, [data, page, totalPages, total, rows, query.isFetching, query.isError, goPrev, goNext])
}
