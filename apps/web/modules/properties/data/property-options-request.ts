import type { PropertyOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const PROPERTY_OPTIONS_QUERY_KEY = ["properties", "options"] as const

export type PropertyOptionsResponse = {
  options: PropertyOption[]
}

export type PropertyOptionsRequestArgs = {
  managementCompanyId?: string
  take?: number
}

export async function searchPropertyOptionsRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: PropertyOptionsRequestArgs = {},
): Promise<PropertyOption[]> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (args.managementCompanyId) params.set("managementCompanyId", args.managementCompanyId)
  params.set("take", String(args.take ?? 20))
  const url = `/api/properties/options?${params.toString()}`
  const result = await requestJson<PropertyOptionsResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
