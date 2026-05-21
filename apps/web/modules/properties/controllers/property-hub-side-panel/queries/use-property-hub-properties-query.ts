"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { LIST_PROPERTIES_PAGE_SIZE, type PropertyListRow } from "@builders/domain"
import {
  PROPERTIES_LIST_QUERY_KEY,
  listPropertiesRequest,
} from "@/modules/properties/data/list-properties-request"

export type PropertyHubPropertiesController = {
  page: number
  totalPages: number
  total: number
  rows: ReadonlyArray<PropertyListRow>
  isFetching: boolean
  isError: boolean
  hasData: boolean
  canPrev: boolean
  canNext: boolean
  goPrev: () => void
  goNext: () => void
}

const EMPTY_ROWS: ReadonlyArray<PropertyListRow> = []

/**
 * Paginated properties under a management company hub. Mirrors the
 * superseded `usePropertyHubViewPropertiesQuery`; the unified hub side
 * panel now owns this query alongside its other modes.
 */
export function usePropertyHubPropertiesQuery(
  managementCompanyId: string | null,
): PropertyHubPropertiesController {
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [managementCompanyId])

  const query = useQuery({
    enabled: managementCompanyId !== null,
    queryKey: [...PROPERTIES_LIST_QUERY_KEY, "hub-view", managementCompanyId, page],
    queryFn: () =>
      listPropertiesRequest({
        filters: { managementCompanyId: [managementCompanyId as string] },
        page,
        pageSize: LIST_PROPERTIES_PAGE_SIZE,
      }),
  })

  const data = query.data
  const total = data?.total ?? 0
  const pageSize = LIST_PROPERTIES_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rows = (data?.rows ?? EMPTY_ROWS) as ReadonlyArray<PropertyListRow>

  const goPrev = useCallback(() => {
    setPage((value) => Math.max(1, value - 1))
  }, [])

  const goNext = useCallback(() => {
    setPage((value) => Math.min(totalPages, value + 1))
  }, [totalPages])

  return useMemo<PropertyHubPropertiesController>(() => {
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
