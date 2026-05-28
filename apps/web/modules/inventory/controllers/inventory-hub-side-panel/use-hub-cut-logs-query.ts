"use client"

import { useCallback, useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import {
  INVENTORY_ADJUSTMENT_PAGE_SIZE,
  type EnrichedInventoryAdjustmentRow,
} from "@builders/domain"
import { FRESH_ON_OPEN } from "@/query-policies"
import {
  INVENTORY_CUT_LOGS_QUERY_KEY,
  inventoryCutLogsPageRequest,
} from "@/modules/inventory/data/inventory-cut-logs-request"

export type HubCutLogsController = {
  rows: ReadonlyArray<EnrichedInventoryAdjustmentRow>
  isLoading: boolean
  isError: boolean
  /** False until the first page resolves — drives the loading/error stub. */
  hasData: boolean
  /** True once resolved with zero rows. */
  isEmpty: boolean
  /** Server reported another page is available. */
  hasMore: boolean
  isFetchingMore: boolean
  loadMore: () => void
}

const EMPTY_ROWS: ReadonlyArray<EnrichedInventoryAdjustmentRow> = []

/**
 * Infinite-scroll cut-logs for a single inventory inside the hub. Reuses the
 * same query-key prefix the inline `InventoryCutLogsSection` does so a mutation
 * that invalidates the cache refreshes both surfaces with no duplicate request.
 * The query key includes `inventoryId`, so switching the hub to a different
 * inventory starts a fresh page-0 fetch. `FRESH_ON_OPEN` refetches on every
 * open so the list reflects concurrent cuts.
 */
export function useHubCutLogsQuery(inventoryId: string | null): HubCutLogsController {
  const query = useInfiniteQuery({
    enabled: inventoryId !== null,
    queryKey: [...INVENTORY_CUT_LOGS_QUERY_KEY, inventoryId],
    queryFn: ({ pageParam, signal }) =>
      inventoryCutLogsPageRequest(
        inventoryId as string,
        pageParam,
        INVENTORY_ADJUSTMENT_PAGE_SIZE,
        signal,
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore
        ? allPages.reduce((acc, page) => acc + page.rows.length, 0)
        : undefined,
    gcTime: 0,
    ...FRESH_ON_OPEN,
  })

  const rows = useMemo<ReadonlyArray<EnrichedInventoryAdjustmentRow>>(
    () => query.data?.pages.flatMap((page) => page.rows) ?? EMPTY_ROWS,
    [query.data],
  )

  const loadMore = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return
    void query.fetchNextPage()
  }, [query])

  return useMemo<HubCutLogsController>(() => {
    const hasData = query.data !== undefined
    return {
      rows,
      isLoading: query.isLoading,
      isError: query.isError,
      hasData,
      isEmpty: hasData && rows.length === 0,
      hasMore: !!query.hasNextPage,
      isFetchingMore: query.isFetchingNextPage,
      loadMore,
    }
  }, [
    rows,
    query.data,
    query.isLoading,
    query.isError,
    query.hasNextPage,
    query.isFetchingNextPage,
    loadMore,
  ])
}
