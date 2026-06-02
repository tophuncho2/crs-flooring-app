import type { InventoryPurchaseOrderOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_PURCHASE_ORDERS_SEARCH_QUERY_KEY = [
  "inventory",
  "purchase-orders",
  "options",
  "search",
] as const

export type InventoryPurchaseOrdersPage = {
  items: InventoryPurchaseOrderOption[]
  hasMore: boolean
}

export type InventoryPurchaseOrdersRequestArgs = {
  skip?: number
  take?: number
}

export async function searchInventoryPurchaseOrderNumbersRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: InventoryPurchaseOrdersRequestArgs = {},
): Promise<InventoryPurchaseOrdersPage> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (args.skip !== undefined && args.skip > 0) params.set("skip", String(args.skip))
  params.set("take", String(args.take ?? 20))
  const url = `/api/inventory/purchase-orders/search?${params.toString()}`
  return requestJson<InventoryPurchaseOrdersPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
