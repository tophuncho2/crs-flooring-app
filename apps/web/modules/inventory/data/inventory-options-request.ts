import type { InventoryOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_OPTIONS_SEARCH_QUERY_KEY = ["inventory", "options", "search"] as const

export type InventoryOptionsPage = {
  items: InventoryOption[]
  hasMore: boolean
}

export type InventoryOptionsRequestArgs = {
  warehouseId: string
  productId?: string
  /**
   * Free-text location filter chip — server-side ILIKE on `inventory.location`.
   * Used by the adjustment side panel inventory picker; independent from the
   * search bar (which targets the denormalized `inventoryItem` column).
   */
  location?: string
  skip?: number
  take?: number
}

/**
 * Infinite-scroll picker/list search. Returns one page (`{ items, hasMore }`);
 * the dropdown controller calls this with increasing `skip` via `pagedSearchFn`.
 * Powers both the adjustment inventory picker and the inventory-hub starting-spot
 * list (filters = warehouse + product + location).
 */
export async function searchInventoryOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: InventoryOptionsRequestArgs,
): Promise<InventoryOptionsPage> {
  const params = new URLSearchParams()
  params.set("warehouseId", args.warehouseId)
  if (args.productId) params.set("productId", args.productId)
  if (args.location) params.set("location", args.location)
  if (search) params.set("search", search)
  if (args.skip !== undefined && args.skip > 0) params.set("skip", String(args.skip))
  params.set("take", String(args.take ?? 20))
  const url = `/api/inventory/options/search?${params.toString()}`
  return requestJson<InventoryOptionsPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
