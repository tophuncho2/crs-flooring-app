"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  INVENTORY_CUT_LOG_PAGE_SIZE,
  type InventoryCutLogRow,
} from "@builders/domain"
import {
  INVENTORY_CUT_LOGS_QUERY_KEY,
  inventoryCutLogsPageRequest,
} from "@/modules/inventory/data/inventory-cut-logs-request"

export type HubCutLogsController = {
  page: number
  totalPages: number
  total: number
  pageSize: number
  rows: ReadonlyArray<InventoryCutLogRow>
  isFetching: boolean
  isLoading: boolean
  isError: boolean
  hasData: boolean
  canPrev: boolean
  canNext: boolean
  goPrev: () => void
  goNext: () => void
}

const EMPTY_ROWS: ReadonlyArray<InventoryCutLogRow> = []

/**
 * Paginated cut-logs for a single inventory inside the hub. Reuses the
 * same query key + fetcher as the inline `InventoryCutLogsSection` so a
 * mutation that invalidates the cache refreshes both surfaces with no
 * duplicate request.
 */
export function useHubCutLogsQuery(inventoryId: string | null): HubCutLogsController {
  const [page, setPage] = useState(1)

  // Reset to page 1 when the hub switches to a different inventory.
  useEffect(() => {
    setPage(1)
  }, [inventoryId])

  const query = useQuery({
    enabled: inventoryId !== null,
    queryKey: [...INVENTORY_CUT_LOGS_QUERY_KEY, inventoryId, page],
    queryFn: ({ signal }) =>
      inventoryCutLogsPageRequest(
        inventoryId as string,
        page,
        INVENTORY_CUT_LOG_PAGE_SIZE,
        signal,
      ),
    staleTime: 0,
    gcTime: 0,
  })

  const data = query.data
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? INVENTORY_CUT_LOG_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rows = (data?.rows ?? EMPTY_ROWS) as ReadonlyArray<InventoryCutLogRow>

  const goPrev = useCallback(() => {
    setPage((value) => Math.max(1, value - 1))
  }, [])

  const goNext = useCallback(() => {
    setPage((value) => Math.min(totalPages, value + 1))
  }, [totalPages])

  return useMemo<HubCutLogsController>(() => {
    const hasData = data !== undefined
    const canPrev = hasData && page > 1 && !query.isFetching
    const canNext = hasData && page < totalPages && !query.isFetching
    return {
      page,
      totalPages,
      total,
      pageSize,
      rows,
      isFetching: query.isFetching,
      isLoading: query.isLoading,
      isError: query.isError,
      hasData,
      canPrev,
      canNext,
      goPrev,
      goNext,
    }
  }, [
    data,
    page,
    totalPages,
    total,
    pageSize,
    rows,
    query.isFetching,
    query.isLoading,
    query.isError,
    goPrev,
    goNext,
  ])
}
