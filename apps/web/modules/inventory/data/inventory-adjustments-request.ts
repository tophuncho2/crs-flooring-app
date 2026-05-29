"use client"

import type { EnrichedInventoryAdjustmentPage } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_ADJUSTMENTS_QUERY_KEY = ["inventory", "adjustments"] as const

type InventoryAdjustmentsPageResponse = {
  page: EnrichedInventoryAdjustmentPage
}

export async function inventoryAdjustmentsPageRequest(
  inventoryId: string,
  skip: number,
  take: number,
  signal: AbortSignal | undefined,
): Promise<EnrichedInventoryAdjustmentPage> {
  const params = new URLSearchParams()
  if (skip > 0) params.set("skip", String(skip))
  params.set("take", String(take))
  const result = await requestJson<InventoryAdjustmentsPageResponse>(
    `/api/inventory/${inventoryId}/adjustments?${params.toString()}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  )
  return result.page
}
