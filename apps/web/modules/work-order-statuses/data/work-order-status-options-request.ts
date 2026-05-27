import type { WorkOrderStatusOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const WORK_ORDER_STATUS_OPTIONS_QUERY_KEY = ["work-order-statuses", "options"] as const

export type WorkOrderStatusOptionsResponse = {
  options: WorkOrderStatusOption[]
}

export type WorkOrderStatusOptionsRequestArgs = {
  take?: number
}

export async function searchWorkOrderStatusOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: WorkOrderStatusOptionsRequestArgs = {},
): Promise<WorkOrderStatusOption[]> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  params.set("take", String(args.take ?? 20))
  const url = `/api/work-order-statuses/options?${params.toString()}`
  const result = await requestJson<WorkOrderStatusOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
