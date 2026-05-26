import type { WorkOrderOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const WORK_ORDER_OPTIONS_SEARCH_QUERY_KEY = [
  "work-orders",
  "options",
  "search",
] as const

export type WorkOrderOptionsResponse = {
  options: WorkOrderOption[]
}

export type WorkOrderOptionsRequestArgs = {
  warehouseId: string
  productId?: string
  take?: number
}

export async function searchWorkOrderOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: WorkOrderOptionsRequestArgs,
): Promise<WorkOrderOption[]> {
  const params = new URLSearchParams()
  params.set("warehouseId", args.warehouseId)
  if (search) params.set("search", search)
  if (args.productId) params.set("productId", args.productId)
  params.set("take", String(args.take ?? 20))
  const url = `/api/work-orders/options/search?${params.toString()}`
  const result = await requestJson<WorkOrderOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
