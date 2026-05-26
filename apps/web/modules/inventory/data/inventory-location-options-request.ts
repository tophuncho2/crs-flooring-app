import type { InventoryLocationOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_LOCATIONS_SEARCH_QUERY_KEY = [
  "inventory",
  "locations",
  "options",
  "search",
] as const

export type InventoryLocationsPage = {
  items: InventoryLocationOption[]
  hasMore: boolean
}

export type InventoryLocationsRequestArgs = {
  warehouseId: string
  skip?: number
  take?: number
}

export async function searchInventoryLocationsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: InventoryLocationsRequestArgs,
): Promise<InventoryLocationsPage> {
  const params = new URLSearchParams()
  params.set("warehouseId", args.warehouseId)
  if (search) params.set("search", search)
  if (args.skip !== undefined && args.skip > 0) params.set("skip", String(args.skip))
  params.set("take", String(args.take ?? 20))
  const url = `/api/inventory/locations/search?${params.toString()}`
  return requestJson<InventoryLocationsPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
