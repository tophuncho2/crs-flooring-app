"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { listWorkOrderCutsRequest } from "@/modules/work-orders/data/mutations"

const WORK_ORDER_CUTS_PREVIEW_QUERY_KEY = ["work-order-cuts-preview"] as const

/**
 * Read-only cuts-only-preview controller. Mirrors the files panel's
 * freshness model: `staleTime: 0, gcTime: 0` so the list refetches on
 * every panel open and the cache is dropped on close. Gated by
 * `enabled` (the panel's open flag).
 */
export function useCutsOnlyPreview({
  workOrderId,
  enabled,
}: {
  workOrderId: string
  enabled: boolean
}) {
  const queryKey = useMemo(
    () => [...WORK_ORDER_CUTS_PREVIEW_QUERY_KEY, workOrderId] as const,
    [workOrderId],
  )

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => listWorkOrderCutsRequest(workOrderId, signal),
    enabled,
    staleTime: 0,
    gcTime: 0,
  })

  return {
    rows: query.data?.rows ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error instanceof Error ? query.error.message : null,
  }
}
