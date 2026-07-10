"use client"

import { useMemo, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { WorkOrderListRow } from "@builders/domain"
import { useRecordSectionPagination, type PaginateContract } from "@/engines/list-view"
import {
  WORK_ORDERS_LIST_QUERY_KEY,
  listWorkOrdersRequest,
  type WorkOrdersListInput,
} from "@/modules/work-orders/data/list-work-orders-request"

export type WorkOrdersSectionTableController = {
  rows: ReadonlyArray<WorkOrderListRow>
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
 * Local-state controller behind the work-orders record-view section table. Page
 * state, the `15` page size, and the pagination contract are owned by the engine
 * (`useRecordSectionPagination`); this controller adds the scoped fetch through
 * the same list endpoint the work-orders list view uses (`listWorkOrdersRequest`).
 * The scoped property / entity rides in as a filter — the property record passes
 * `propertyId`, the entity record passes `entityId` (the backend maps that to
 * `property.entityId`). Any scope change resets to page 1. `enabled` gates the fetch.
 */
export function useWorkOrdersSectionTable({
  entityId,
  propertyId,
  enabled,
}: {
  entityId: string | null
  propertyId: string | null
  enabled: boolean
}): WorkOrdersSectionTableController {
  const pager = useRecordSectionPagination()

  // Re-scoping (different entity / property) returns to page 1. Reset during render
  // against the previous scope rather than in an effect — React applies it before
  // paint with no extra commit (the recommended "adjust state when a prop
  // changes" pattern).
  const scopeKey = `${entityId ?? ""}|${propertyId ?? ""}`
  const [prevScopeKey, setPrevScopeKey] = useState(scopeKey)
  if (scopeKey !== prevScopeKey) {
    setPrevScopeKey(scopeKey)
    pager.reset()
  }

  const input = useMemo<WorkOrdersListInput>(() => {
    return {
      // Record-view sections always show newest rows first (id final tiebreak).
      sorts: [{ field: "createdAt", direction: "desc" }],
      filters: {
        ...(entityId ? { entityId: [entityId] } : {}),
        ...(propertyId ? { propertyId: [propertyId] } : {}),
      },
      page: pager.page,
      pageSize: pager.pageSize,
    }
  }, [entityId, propertyId, pager.page, pager.pageSize])

  const query = useQuery({
    queryKey: [...WORK_ORDERS_LIST_QUERY_KEY, "record-section", input],
    queryFn: () => listWorkOrdersRequest(input),
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
          ? "Failed to load work orders."
          : null,
  }
}
