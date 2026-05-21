"use client"

import type { InventoryDetail } from "@builders/domain"
import { requestJson } from "@/transport/http"

export type InventoryBalances = Pick<
  InventoryDetail,
  "stockBalance" | "totalCutSum" | "coverageBalance"
>

type InventoryBalancesResponse = {
  balances: InventoryBalances
}

export async function fetchInventoryBalances(
  inventoryId: string,
  signal?: AbortSignal,
): Promise<InventoryBalances> {
  const result = await requestJson<InventoryBalancesResponse>(
    `/api/inventory/${inventoryId}/balances`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    },
  )
  return result.balances
}
