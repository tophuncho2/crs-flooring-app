"use client"

import { useQuery } from "@tanstack/react-query"
import type { InventoryDetail } from "@builders/domain"
import { FRESH_ON_OPEN } from "@/query-policies"
import {
  INVENTORY_DETAIL_QUERY_KEY,
  inventoryDetailRequest,
} from "@/modules/inventory/data/inventory-detail-request"

export type UseInventoryDetailQueryOptions = {
  /** Disable the query (e.g. when an initial snapshot is in hand). */
  enabled?: boolean
}

/**
 * Fetches `InventoryDetail` for the given id via `GET /api/inventory/[id]`.
 * Used by the hub when opened from a context that does not already have
 * the inventory loaded (e.g. a cut-log panel in the work-orders flow that
 * only has `cutLog.inventoryId`).
 */
export function useInventoryDetailQuery(
  inventoryId: string | null,
  options: UseInventoryDetailQueryOptions = {},
) {
  const { enabled = true } = options
  return useQuery<InventoryDetail>({
    enabled: enabled && inventoryId !== null,
    queryKey: [...INVENTORY_DETAIL_QUERY_KEY, inventoryId],
    queryFn: ({ signal }) => inventoryDetailRequest(inventoryId as string, signal),
    refetchOnWindowFocus: false,
    // Refetch on every open so the cells card reflects concurrent edits when
    // the hub is reused across surfaces (property-hub parity).
    ...FRESH_ON_OPEN,
  })
}
