import type { PropertyOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const PROPERTY_OPTIONS_QUERY_KEY = ["properties", "options"] as const

export type PropertyOptionsPage = {
  items: PropertyOption[]
  hasMore: boolean
}

export type PropertyOptionsRequestArgs = {
  entityId?: string
  skip?: number
  take?: number
}

export async function searchPropertyOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: PropertyOptionsRequestArgs = {},
): Promise<PropertyOptionsPage> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (args.entityId) params.set("entityId", args.entityId)
  if (args.skip !== undefined && args.skip > 0) params.set("skip", String(args.skip))
  params.set("take", String(args.take ?? 50))
  const url = `/api/properties/options?${params.toString()}`
  return requestJson<PropertyOptionsPage>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
}
