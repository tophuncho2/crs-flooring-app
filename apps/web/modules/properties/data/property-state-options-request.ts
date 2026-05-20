import type { PropertyStateOption } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const PROPERTY_STATES_SEARCH_QUERY_KEY = [
  "properties",
  "states",
  "options",
  "search",
] as const

export type PropertyStatesResponse = {
  options: PropertyStateOption[]
}

export async function searchPropertyStatesRequest(
  search: string,
  signal: AbortSignal | undefined,
  args: { take?: number } = {},
): Promise<PropertyStateOption[]> {
  const params = new URLSearchParams()
  if (search) params.set("search", search)
  params.set("take", String(args.take ?? 20))
  const url = `/api/properties/states/search?${params.toString()}`
  const result = await requestJson<PropertyStatesResponse>(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  })
  return result.options
}
