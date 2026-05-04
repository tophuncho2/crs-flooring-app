import type { InventoryOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_OPTIONS_SEARCH_QUERY_KEY = ["inventory", "options", "search"] as const

export type InventoryOptionsResponse = {
  options: InventoryOption[]
}

export type InventoryOptionsRequestArgs = {
  warehouseId: string
  productId?: string
  sectionId?: string
  locationId?: string
  take?: number
}

export async function searchInventoryOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: InventoryOptionsRequestArgs,
): Promise<InventoryOption[]> {
  const params = new URLSearchParams()
  params.set("warehouseId", args.warehouseId)
  if (args.productId) params.set("productId", args.productId)
  if (args.sectionId) params.set("sectionId", args.sectionId)
  if (args.locationId) params.set("locationId", args.locationId)
  if (search) params.set("search", search)
  params.set("take", String(args.take ?? 20))
  const url = `/api/inventory/options/search?${params.toString()}`
  const result = await requestJson<InventoryOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
