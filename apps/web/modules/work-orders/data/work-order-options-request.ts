import type { WorkOrderOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const WORK_ORDER_OPTIONS_SEARCH_QUERY_KEY = [
  "work-orders",
  "options",
  "search",
] as const

export type WorkOrderOptionsPage = {
  items: WorkOrderOption[]
  hasMore: boolean
}

export type WorkOrderOptionsRequestArgs = {
  warehouseId: string
  productId?: string
  skip?: number
  take?: number
}

export async function searchWorkOrderOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: WorkOrderOptionsRequestArgs,
): Promise<WorkOrderOptionsPage> {
  const params = new URLSearchParams()
  params.set("warehouseId", args.warehouseId)
  if (search) params.set("search", search)
  if (args.productId) params.set("productId", args.productId)
  if (args.skip !== undefined && args.skip > 0) params.set("skip", String(args.skip))
  params.set("take", String(args.take ?? 20))
  const url = `/api/work-orders/options/search?${params.toString()}`
  return requestJson<WorkOrderOptionsPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
