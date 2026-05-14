import type { InventoryLocationOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_LOCATIONS_SEARCH_QUERY_KEY = [
  "inventory",
  "locations",
  "options",
  "search",
] as const

export type InventoryLocationsResponse = {
  options: InventoryLocationOption[]
}

export type InventoryLocationsRequestArgs = {
  warehouseId: string
  take?: number
}

export async function searchInventoryLocationsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: InventoryLocationsRequestArgs,
): Promise<InventoryLocationOption[]> {
  const params = new URLSearchParams()
  params.set("warehouseId", args.warehouseId)
  if (search) params.set("search", search)
  params.set("take", String(args.take ?? 20))
  const url = `/api/inventory/locations/search?${params.toString()}`
  const result = await requestJson<InventoryLocationsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
