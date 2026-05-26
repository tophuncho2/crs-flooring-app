"use client"

import { useCallback, useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { LIST_PROPERTIES_PAGE_SIZE, type PropertyListRow } from "@builders/domain"
import {
  PROPERTIES_LIST_QUERY_KEY,
  listPropertiesRequest,
} from "@/modules/properties/data/list-properties-request"

export type PropertyHubPropertiesController = {
  total: number
  rows: ReadonlyArray<PropertyListRow>
  isFetching: boolean
  isError: boolean
  hasData: boolean
  hasMore: boolean
  isFetchingMore: boolean
  loadMore: () => void
}

const EMPTY_ROWS: ReadonlyArray<PropertyListRow> = []

/**
 * Infinite-scroll properties under a management company hub. Pages the
 * existing list endpoint (`listPropertiesRequest`) by page number and
 * flattens the result; the consumer loads more on scroll. The query key
 * includes the management company id, so switching hubs starts a fresh
 * list at page 1 without manual reset.
 */
export function usePropertyHubPropertiesQuery(
  managementCompanyId: string | null,
): PropertyHubPropertiesController {
  const query = useInfiniteQuery({
    enabled: managementCompanyId !== null,
    queryKey: [...PROPERTIES_LIST_QUERY_KEY, "hub-view", managementCompanyId],
    queryFn: ({ pageParam }) =>
      listPropertiesRequest({
        filters: { managementCompanyId: [managementCompanyId as string] },
        page: pageParam,
        pageSize: LIST_PROPERTIES_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, page) => acc + page.rows.length, 0)
      return loaded < lastPage.total ? allPages.length + 1 : undefined
    },
  })

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = query

  const rows = useMemo<ReadonlyArray<PropertyListRow>>(
    () => (data ? data.pages.flatMap((page) => page.rows) : EMPTY_ROWS),
    [data],
  )

  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return
    void fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return useMemo<PropertyHubPropertiesController>(
    () => ({
      total: data?.pages[0]?.total ?? 0,
      rows,
      isFetching: query.isFetching,
      isError: query.isError,
      hasData: data !== undefined,
      hasMore: !!hasNextPage,
      isFetchingMore: isFetchingNextPage,
      loadMore,
    }),
    [data, rows, query.isFetching, query.isError, hasNextPage, isFetchingNextPage, loadMore],
  )
}
