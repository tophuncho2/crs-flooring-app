"use client"

import type { InventoryDetail } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_DETAIL_QUERY_KEY = ["inventory", "detail"] as const

type InventoryDetailResponse = {
  inventory: InventoryDetail
}

export async function inventoryDetailRequest(
  inventoryId: string,
  signal?: AbortSignal,
): Promise<InventoryDetail> {
  const result = await requestJson<InventoryDetailResponse>(
    `/api/inventory/${inventoryId}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  )
  return result.inventory
}
