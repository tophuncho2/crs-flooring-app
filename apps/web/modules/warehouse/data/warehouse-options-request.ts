import type { WarehouseOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const WAREHOUSE_OPTIONS_QUERY_KEY = ["warehouses", "options"] as const

export type WarehouseOptionsPage = {
  items: WarehouseOption[]
  hasMore: boolean
}

/**
 * Infinite-scroll picker search. Signature matches the dropdown controller's
 * `pagedSearchFn(query, signal, skip)`, so it can be wired directly.
 */
export async function searchWarehouseOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  skip = 0,
  take = 20,
): Promise<WarehouseOptionsPage> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (skip > 0) params.set("skip", String(skip))
  params.set("take", String(take))
  const url = `/api/warehouses/options?${params.toString()}`
  return requestJson<WarehouseOptionsPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
