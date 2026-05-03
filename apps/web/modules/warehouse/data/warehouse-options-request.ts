import type { WarehouseOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const WAREHOUSE_OPTIONS_QUERY_KEY = ["warehouses", "options"] as const

export type WarehouseOptionsResponse = {
  options: WarehouseOption[]
}

export async function searchWarehouseOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  take = 20,
): Promise<WarehouseOption[]> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  params.set("take", String(take))
  const url = `/api/warehouses/options?${params.toString()}`
  const result = await requestJson<WarehouseOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
