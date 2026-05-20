import type { WorkOrderMaterialItemOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const WORK_ORDER_MATERIAL_ITEM_OPTIONS_QUERY_KEY = [
  "work-orders",
  "material-items",
  "options",
] as const

export type WorkOrderMaterialItemOptionsResponse = {
  options: WorkOrderMaterialItemOption[]
}

export type WorkOrderMaterialItemOptionsRequestArgs = {
  workOrderId: string
  productId: string
  take?: number
}

/**
 * The picker doesn't take free-text search — per-WO row counts are small
 * and the dropdown renders all WOMIs matching `productId`. We still expose
 * a `search` signature so it composes with `useAsyncRichDropdownController`,
 * which always passes one.
 */
export async function searchWorkOrderMaterialItemOptionsRequest(
  _search: string,
  signal: AbortSignal | undefined,
  args: WorkOrderMaterialItemOptionsRequestArgs,
): Promise<WorkOrderMaterialItemOption[]> {
  const params = new URLSearchParams()
  params.set("productId", args.productId)
  params.set("take", String(args.take ?? 50))
  const url = `/api/work-orders/${args.workOrderId}/material-items/options?${params.toString()}`
  const result = await requestJson<WorkOrderMaterialItemOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
