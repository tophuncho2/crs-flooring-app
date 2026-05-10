import type { InventoryOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_OPTIONS_SEARCH_QUERY_KEY = ["inventory", "options", "search"] as const

export type InventoryOptionsResponse = {
  options: InventoryOption[]
}

export type InventoryOptionsRequestArgs = {
  warehouseId: string
  productId?: string
  /**
   * Free-text location filter chip — server-side ILIKE on `inventory.location`.
   * Used by the cut-log side panel inventory picker; independent from the
   * search bar (which targets the denormalized `inventoryItem` column).
   */
  location?: string
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
  if (args.location) params.set("location", args.location)
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
