"use client"

import { useCallback, useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { LIST_TEMPLATES_PAGE_SIZE, type TemplateListRow } from "@builders/domain"
import {
  TEMPLATES_LIST_QUERY_KEY,
  listTemplatesRequest,
} from "@/modules/templates/data/list-templates-request"
import { FRESH_ON_OPEN } from "@/query-policies"

export type PropertyHubTemplatesController = {
  total: number
  rows: ReadonlyArray<TemplateListRow>
  isFetching: boolean
  isError: boolean
  hasData: boolean
  hasMore: boolean
  isFetchingMore: boolean
  loadMore: () => void
}

const EMPTY_ROWS: ReadonlyArray<TemplateListRow> = []

/**
 * Infinite-scroll templates under a hub, optionally filtered to one property.
 * Pages the existing list endpoint (`listTemplatesRequest`) by page number and
 * flattens the result. The query key includes the management company id and
 * the selected property filter, so changing either starts a fresh list at
 * page 1 without manual reset.
 */
export function usePropertyHubTemplatesQuery(
  managementCompanyId: string | null,
  selectedPropertyId: string | null,
): PropertyHubTemplatesController {
  const query = useInfiniteQuery({
    ...FRESH_ON_OPEN,
    enabled: managementCompanyId !== null,
    queryKey: [
      ...TEMPLATES_LIST_QUERY_KEY,
      "hub-view",
      managementCompanyId,
      selectedPropertyId,
    ],
    queryFn: ({ pageParam }) =>
      listTemplatesRequest({
        filters:
          selectedPropertyId !== null
            ? { propertyId: [selectedPropertyId] }
            : { managementCompanyId: [managementCompanyId as string] },
        page: pageParam,
        pageSize: LIST_TEMPLATES_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, page) => acc + page.rows.length, 0)
      return loaded < lastPage.total ? allPages.length + 1 : undefined
    },
  })

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = query

  const rows = useMemo<ReadonlyArray<TemplateListRow>>(
    () => (data ? data.pages.flatMap((page) => page.rows) : EMPTY_ROWS),
    [data],
  )

  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return
    void fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return useMemo<PropertyHubTemplatesController>(
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
