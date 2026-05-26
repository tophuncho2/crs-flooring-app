"use client"

import type { InventoryCutLogPage } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_CUT_LOGS_QUERY_KEY = ["inventory", "cut-logs"] as const

type InventoryCutLogsPageResponse = {
  page: InventoryCutLogPage
}

export async function inventoryCutLogsPageRequest(
  inventoryId: string,
  skip: number,
  take: number,
  signal: AbortSignal | undefined,
): Promise<InventoryCutLogPage> {
  const params = new URLSearchParams()
  if (skip > 0) params.set("skip", String(skip))
  params.set("take", String(take))
  const result = await requestJson<InventoryCutLogsPageResponse>(
    `/api/inventory/${inventoryId}/cut-logs?${params.toString()}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  )
  return result.page
}
