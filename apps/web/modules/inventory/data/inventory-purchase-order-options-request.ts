import type { InventoryPurchaseOrderOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const INVENTORY_PURCHASE_ORDER_OPTIONS_QUERY_KEY = [
  "inventory",
  "options",
  "purchase-orders",
] as const

export type InventoryPurchaseOrderOptionsRequestArgs = {
  warehouseId: string
  isArchived?: boolean
  take?: number
}

export type InventoryPurchaseOrderOptionsResponse = {
  options: InventoryPurchaseOrderOption[]
}

export async function searchInventoryPurchaseOrderOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: InventoryPurchaseOrderOptionsRequestArgs,
): Promise<InventoryPurchaseOrderOption[]> {
  const params = new URLSearchParams()
  params.set("warehouseId", args.warehouseId)
  if (args.isArchived !== undefined) {
    params.set("archived", args.isArchived ? "true" : "false")
  }
  if (search) params.set("search", search)
  params.set("take", String(args.take ?? 20))
  const url = `/api/inventory/options/purchase-orders?${params.toString()}`
  const result = await requestJson<InventoryPurchaseOrderOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
